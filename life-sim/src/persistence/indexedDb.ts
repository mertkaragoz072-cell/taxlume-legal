import type { SaveStorage } from './save';

const DB_NAME = 'life-sim';
const STORE = 'saves';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        t.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

/** Durable browser/webview storage. Falls back to localStorage if IndexedDB is unavailable. */
export class IndexedDbStorage implements SaveStorage {
  async read(key: string): Promise<string | null> {
    if (typeof indexedDB === 'undefined') return localStorage.getItem(key);
    const v = await tx<unknown>('readonly', (s) => s.get(key));
    return typeof v === 'string' ? v : null;
  }
  async write(key: string, value: string): Promise<void> {
    if (typeof indexedDB === 'undefined') return localStorage.setItem(key, value);
    await tx('readwrite', (s) => s.put(value, key));
  }
  async remove(key: string): Promise<void> {
    if (typeof indexedDB === 'undefined') return localStorage.removeItem(key);
    await tx('readwrite', (s) => s.delete(key));
  }
}
