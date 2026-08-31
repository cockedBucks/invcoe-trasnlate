import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { QueueItem } from './types';

interface InvoiceDB extends DBSchema {
  queue_items: {
    key: string;
    value: QueueItem;
    indexes: { 'by-status': string; 'by-time': number };
  };
}

const DB_NAME = 'invoice_translator_db';
const DB_VERSION = 2; // Incremented version to refresh schema if needed

let dbPromise: Promise<IDBPDatabase<InvoiceDB>> | null = null;

function getDb() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<InvoiceDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('queue_items')) {
          const store = db.createObjectStore('queue_items', { keyPath: 'id' });
          store.createIndex('by-status', 'status');
          store.createIndex('by-time', 'startTime');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveQueueItemToDb(item: QueueItem): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Store item including File / Blob in IndexedDB
    await db.put('queue_items', item);
  } catch (err) {
    console.warn('Failed to store full file in IDB, falling back to metadata:', err);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { file, ...rest } = item;
    await db.put('queue_items', rest as QueueItem);
  }
}

export async function saveAllQueueItemsToDb(items: QueueItem[]): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const tx = db.transaction('queue_items', 'readwrite');
  for (const item of items) {
    try {
      await tx.store.put(item);
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { file, ...rest } = item;
      await tx.store.put(rest as QueueItem);
    }
  }
  await tx.done;
}

export async function loadQueueItemsFromDb(): Promise<QueueItem[]> {
  const db = await getDb();
  if (!db) return [];

  const items = await db.getAll('queue_items');
  return items as QueueItem[];
}

export async function removeQueueItemFromDb(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete('queue_items', id);
}

export async function clearAllDbItems(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.clear('queue_items');
}
