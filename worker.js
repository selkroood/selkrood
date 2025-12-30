// worker.js
let db = null;
let remainder = "";

// دالة تضمن فتح قاعدة البيانات والتأكد من وجود المخزن قبل أي عملية
const getDB = () => {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);
        
        // رفع الإصدار إلى 5 لضمان تشغيل onupgradeneeded
        const req = indexedDB.open("SHADOW_ENGINE", 5);

        req.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains("vault")) {
                database.createObjectStore("vault", { autoIncrement: true });
                console.log("Worker: Object store 'vault' created.");
            }
        };

        req.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };

        req.onerror = (e) => {
            console.error("Worker: IDB Error", e.target.error);
            reject(e.target.error);
        };
    });
};

self.onmessage = async (e) => {
    try {
        const database = await getDB();
        const { file } = e.data;
        const reader = file.stream().getReader();
        const decoder = new TextDecoder();
        let count = 0;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const text = remainder + decoder.decode(value, { stream: true });
            const lines = text.split(/\r?\n/);
            remainder = lines.pop();

            const batch = lines.filter(l => l.trim()).map(line => {
                const match = line.match(/@([^:\s/]+)/);
                return { 
                    raw: line, 
                    domain: match ? match[1].toLowerCase() : 'unknown',
                    ts: Date.now()
                };
            });

            if (batch.length > 0) {
                const tx = database.transaction("vault", "readwrite");
                const store = tx.objectStore("vault");
                batch.forEach(item => store.add(item));
                
                await new Promise((res) => {
                    tx.oncomplete = () => res();
                });
                
                count += batch.length;
                self.postMessage({ type: 'PROGRESS', count });
            }
        }

        // معالجة السطر الأخير
        if (remainder.trim()) {
            const tx = database.transaction("vault", "readwrite");
            const match = remainder.match(/@([^:\s/]+)/);
            tx.objectStore("vault").add({ 
                raw: remainder.trim(), 
                domain: match ? match[1].toLowerCase() : 'unknown',
                ts: Date.now()
            });
            count++;
        }

        self.postMessage({ type: 'COMPLETE', total: count });

    } catch (error) {
        self.postMessage({ type: 'ERROR', message: error.toString() });
    }
};
