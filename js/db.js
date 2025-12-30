const ShadowDB = {
    dbName: 'ShadowV64_DB',
    storeName: 'records',
    db: null,

    open() {
        return new Promise((resolve) => {
            const req = indexedDB.open(this.dbName, 1);
            req.onupgradeneeded = (e) => e.target.result.createObjectStore(this.storeName, { keyPath: 'id' });
            req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
        });
    },

    addBulk(records) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            records.forEach(r => store.put(r));
            tx.oncomplete = () => resolve();
        });
    },

    getAll() {
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readonly');
            tx.objectStore(this.storeName).getAll().onsuccess = (e) => resolve(e.target.result);
        });
    },

    count() {
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readonly');
            tx.objectStore(this.storeName).count().onsuccess = (e) => resolve(e.target.result);
        });
    },

    clear() {
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            tx.objectStore(this.storeName).clear().onsuccess = () => resolve();
        });
    }
};
