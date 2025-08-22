import type { Category, DateRange, PaginatedResult, Pagination, RecordItem, StorageProviderInfo, DataSnapshot } from './types';
import { validateCategory, validateRecord } from './validate';
import { createIDBProvider } from './providers/idbProvider';
import { createLocalStorageProvider } from './providers/localStorageProvider';

export interface StorageAPI {
  info(): Promise<StorageProviderInfo>;

  // categories
  upsertCategory(category: Category): Promise<void>;
  deleteCategory(categoryId: string): Promise<void>;
  listCategories(): Promise<Category[]>;

  // records
  upsertRecord(record: RecordItem): Promise<void>;
  deleteRecord(recordId: string): Promise<void>;
  getRecord(recordId: string): Promise<RecordItem | undefined>;
  queryRecordsByDate(range: DateRange, pagination?: Pagination): Promise<PaginatedResult<RecordItem>>;
  queryRecordsByCategory(categoryId: string, range?: DateRange, pagination?: Pagination): Promise<PaginatedResult<RecordItem>>;

  // snapshot
  exportSnapshot(): Promise<DataSnapshot>;
  importSnapshot(data: DataSnapshot, mode: 'merge' | 'replace'): Promise<void>;
}

function ensureValidCategory(category: Category): void {
  const res = validateCategory(category);
  if (!res.ok) throw new Error(`Invalid category: ${JSON.stringify(res.issues)}`);
}

function ensureValidRecord(record: RecordItem): void {
  const res = validateRecord(record);
  if (!res.ok) throw new Error(`Invalid record: ${JSON.stringify(res.issues)}`);
}

export async function createStorage(): Promise<StorageAPI> {
  try {
    const idb = await createIDBProvider();
    return wrapValidation(idb);
  } catch {
    const fallback = createLocalStorageProvider();
    return wrapValidation(fallback);
  }
}

function wrapValidation(inner: StorageAPI): StorageAPI {
  return {
    async info() { return inner.info(); },
    async upsertCategory(category) { ensureValidCategory(category); return inner.upsertCategory(category); },
    async deleteCategory(id) { return inner.deleteCategory(id); },
    async listCategories() { return inner.listCategories(); },
    async upsertRecord(record) { ensureValidRecord(record); return inner.upsertRecord(record); },
    async deleteRecord(id) { return inner.deleteRecord(id); },
    async getRecord(id) { return inner.getRecord(id); },
    async queryRecordsByDate(range, pagination) { return inner.queryRecordsByDate(range, pagination); },
    async queryRecordsByCategory(categoryId, range, pagination) { return inner.queryRecordsByCategory(categoryId, range, pagination); },
    async exportSnapshot() { return inner.exportSnapshot(); },
    async importSnapshot(data, mode) { return inner.importSnapshot(data, mode); },
  };
}

export async function getProviderInfo(): Promise<StorageProviderInfo> {
  const api = await createStorage();
  return api.info();
}


