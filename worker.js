// worker.js
let db;
let remainder = "";

const initDB = () => {
    const req = indexedDB.open("SHADOW_ENGINE", 4);
    req.onsuccess = (e) => { db = e.target.result; };
};
initDB();

self.onmessage = async (e) => {
    const { file } = e.data;
    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    let count = 0;

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = remainder + decoder.decode(value, { stream: true });
        const lines = text.split(/\r?\n/);
        remainder = lines.pop(); // الحفاظ على السطر غير المكتمل

        const batch = lines.filter(l => l.trim()).map(line => {
            const match = line.match(/@([^:\s/]+)/);
            return { raw: line, domain: match ? match[1].toLowerCase() : 'unknown' };
        });

        if (batch.length > 0) {
            const tx = db.transaction("vault", "readwrite");
            const store = tx.objectStore("vault");
            batch.forEach(item => store.add(item));
            await new Promise(r => tx.oncomplete = r);
            count += batch.length;
            self.postMessage({ type: 'PROGRESS', count });
        }
    }

    // معالجة السطر الأخير (Note #1 fix)
    if (remainder.trim()) {
        const tx = db.transaction("vault", "readwrite");
        const match = remainder.match(/@([^:\s/]+)/);
        tx.objectStore("vault").add({ raw: remainder, domain: match ? match[1].toLowerCase() : 'unknown' });
        count++;
    }

    self.postMessage({ type: 'COMPLETE', total: count });
};
