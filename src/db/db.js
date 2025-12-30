import { openDB } from 'idb';

const DB_NAME = 'ShadowV64_DB';
const STORE_NAME = 'datasets';

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function saveChunk(data) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all(data.map(item => tx.store.add(item)));
  await tx.done;
}

export async function clearDB() {
  const db = await initDB();
  await db.clear(STORE_NAME);
}