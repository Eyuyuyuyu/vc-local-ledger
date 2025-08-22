import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import { CURRENT_SCHEMA_VERSION } from './types';
import type { Category, RecordItem } from './types';

interface LedgerDB extends DBSchema {
  categories: {
    key: string;
    value: Category;
    indexes: { by_name: string; by_sort: number };
  };
  records: {
    key: string;
    value: RecordItem;
    indexes: { by_date: string; by_categoryId: string; by_date_category: [string, string] };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

let dbPromise: Promise<IDBPDatabase<LedgerDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<LedgerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LedgerDB>('local-ledger', CURRENT_SCHEMA_VERSION, {
      upgrade(db, oldVersion) {
        // v1
        if (oldVersion < 1) {
          const categories = db.createObjectStore('categories', { keyPath: 'id' });
          categories.createIndex('by_name', 'name', { unique: true });
          categories.createIndex('by_sort', 'sort');

          const records = db.createObjectStore('records', { keyPath: 'id' });
          records.createIndex('by_date', 'date');
          records.createIndex('by_categoryId', 'categoryId');
          records.createIndex('by_date_category', ['date', 'categoryId']);

          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function isIDBAvailable(): Promise<boolean> {
  try {
    await getDB();
    return true;
  } catch {
    return false;
  }
}


