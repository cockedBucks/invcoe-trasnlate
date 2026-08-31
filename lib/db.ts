import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { QueueItem } from './types';

interface InvoiceDB extends DBSchema {
  queue_items: {
    key: string;
    value: Omit<QueueItem, 'file'> & { hasFileBlob?: boolean };
    indexes: { 'by-status': string; 'by-time': number };
  };
}

const DB_NAME = 'invoice_translator_db';
const DB_VERSION = 1;

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

  // We omit the File handle to keep storage lightweight and serializable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { file, ...serializableItem } = item;
  await db.put('queue_items', serializableItem);
}

export async function saveAllQueueItemsToDb(items: QueueItem[]): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const tx = db.transaction('queue_items', 'readwrite');
  for (const item of items) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { file, ...serializableItem } = item;
    await tx.store.put(serializableItem);
  }
  await tx.done;
}

export async function loadQueueItemsFromDb(): Promise<QueueItem[]> {
  const db = await getDb();
  if (!db) return [];

  const items = await db.getAll('queue_items');
  return items.map((item) => ({
    ...item,
    file: undefined,
  })) as QueueItem[];
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
