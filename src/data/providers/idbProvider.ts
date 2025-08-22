import { getDB } from '../idb';
import { CURRENT_SCHEMA_VERSION } from '../types';
import type { Category, DataSnapshot, DateRange, PaginatedResult, Pagination, RecordItem, StorageProviderInfo } from '../types';
import type { StorageAPI } from '../storage';

function paginateArray<T>(items: T[], pagination?: Pagination): PaginatedResult<T> {
  const limit = pagination?.limit ?? 50;
  const startIndex = 0;
  const page = items.slice(startIndex, startIndex + limit);
  const nextCursor = items.length > startIndex + limit ? String(startIndex + limit) : undefined;
  return { items: page, nextCursor };
}

export async function createIDBProvider(): Promise<StorageAPI> {
  const db = await getDB();

  const api: StorageAPI = {
    async info(): Promise<StorageProviderInfo> {
      return { name: 'idb', ready: true, schemaVersion: CURRENT_SCHEMA_VERSION };
    },
    async upsertCategory(category: Category): Promise<void> {
      await db.put('categories', category);
    },
    async deleteCategory(categoryId: string): Promise<void> {
      await db.delete('categories', categoryId);
    },
    async listCategories(): Promise<Category[]> {
      const tx = db.transaction('categories');
      const all = await tx.store.getAll();
      return all.sort((a, b) => a.sort - b.sort);
    },
    async upsertRecord(record: RecordItem): Promise<void> {
      await db.put('records', record);
    },
    async deleteRecord(recordId: string): Promise<void> {
      await db.delete('records', recordId);
    },
    async getRecord(recordId: string): Promise<RecordItem | undefined> {
      return db.get('records', recordId);
    },
    async queryRecordsByDate(range: DateRange, pagination?: Pagination): Promise<PaginatedResult<RecordItem>> {
      const index = (await db).transaction('records').store.index('by_date');
      const items: RecordItem[] = [];
      for await (const cursor of index.iterate(IDBKeyRange.bound(range.start, range.end))) {
        items.push(cursor.value);
      }
      items.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date.localeCompare(b.date)));
      return paginateArray(items, pagination);
    },
    async queryRecordsByCategory(categoryId: string, range?: DateRange, pagination?: Pagination): Promise<PaginatedResult<RecordItem>> {
      const idx = (await db).transaction('records').store.index(range ? 'by_date_category' : 'by_categoryId');
      const items: RecordItem[] = [];
      if (range) {
        const lower: [string, string] = [range.start, categoryId];
        const upper: [string, string] = [range.end, categoryId];
        for await (const cursor of idx.iterate(IDBKeyRange.bound(lower, upper))) {
          items.push(cursor.value);
        }
      } else {
        for await (const cursor of idx.iterate(categoryId)) {
          items.push(cursor.value);
        }
      }
      items.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date.localeCompare(b.date)));
      return paginateArray(items, pagination);
    },
    async exportSnapshot(): Promise<DataSnapshot> {
      const tx = db.transaction(['categories', 'records']);
      const categories = await tx.objectStore('categories').getAll();
      const records = await tx.objectStore('records').getAll();
      return {
        version: { schemaVersion: CURRENT_SCHEMA_VERSION, migratedAt: Date.now() },
        categories,
        records,
      };
    },
    async importSnapshot(data: DataSnapshot, mode: 'merge' | 'replace'): Promise<void> {
      const tx = db.transaction(['categories', 'records', 'meta'], 'readwrite');
      if (mode === 'replace') {
        await tx.objectStore('categories').clear();
        await tx.objectStore('records').clear();
      }
      for (const c of data.categories) await tx.objectStore('categories').put(c);
      for (const r of data.records) await tx.objectStore('records').put(r);
      await tx.done;
    },
  };

  return api;
}


