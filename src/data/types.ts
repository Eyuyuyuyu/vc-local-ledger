export type ID = string;

export interface Category {
  id: ID;
  name: string;
  icon: string; // emoji or icon key
  color: string; // hex color
  sort: number;
}

export interface RecordItem {
  id: ID;
  date: string; // ISO date YYYY-MM-DD
  categoryId: ID;
  amount: number; // in minor units or decimal based on settings
  note?: string;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  version: number;
}

export interface DataVersion {
  schemaVersion: number;
  migratedAt: number; // epoch ms
}

export interface Pagination {
  limit: number;
  cursor?: string; // opaque cursor
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
}

export interface DateRange {
  start: string; // inclusive YYYY-MM-DD
  end: string; // inclusive YYYY-MM-DD
}

export type StorageProviderName = 'idb' | 'localStorage';

export interface StorageProviderInfo {
  name: StorageProviderName;
  ready: boolean;
  schemaVersion: number;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues?: ValidationIssue[];
}

export interface DataSnapshot {
  version: DataVersion;
  categories: Category[];
  records: RecordItem[];
}

export const CURRENT_SCHEMA_VERSION = 1;


