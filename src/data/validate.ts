import type { Category, RecordItem, ValidationIssue, ValidationResult } from './types';

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function validateCategory(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const c = input as Partial<Category>;
  if (!c || typeof c !== 'object') return { ok: false, issues: [{ path: '', message: 'Category must be object' }] };
  if (!c.id || typeof c.id !== 'string') issues.push({ path: 'id', message: 'id required string' });
  if (!c.name || typeof c.name !== 'string') issues.push({ path: 'name', message: 'name required string' });
  if (!c.icon || typeof c.icon !== 'string') issues.push({ path: 'icon', message: 'icon required string' });
  if (!c.color || typeof c.color !== 'string') issues.push({ path: 'color', message: 'color required string' });
  if (typeof c.sort !== 'number') issues.push({ path: 'sort', message: 'sort required number' });
  return { ok: issues.length === 0, issues: issues.length ? issues : undefined };
}

export function validateRecord(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const r = input as Partial<RecordItem>;
  if (!r || typeof r !== 'object') return { ok: false, issues: [{ path: '', message: 'Record must be object' }] };
  if (!r.id || typeof r.id !== 'string') issues.push({ path: 'id', message: 'id required string' });
  if (!r.date || typeof r.date !== 'string' || !isIsoDate(r.date)) issues.push({ path: 'date', message: 'date YYYY-MM-DD' });
  if (!r.categoryId || typeof r.categoryId !== 'string') issues.push({ path: 'categoryId', message: 'categoryId required string' });
  if (typeof r.amount !== 'number' || Number.isNaN(r.amount)) issues.push({ path: 'amount', message: 'amount required number' });
  if (r.note !== undefined && typeof r.note !== 'string') issues.push({ path: 'note', message: 'note must be string' });
  if (typeof r.createdAt !== 'number') issues.push({ path: 'createdAt', message: 'createdAt required number' });
  if (typeof r.updatedAt !== 'number') issues.push({ path: 'updatedAt', message: 'updatedAt required number' });
  if (typeof r.version !== 'number') issues.push({ path: 'version', message: 'version required number' });
  return { ok: issues.length === 0, issues: issues.length ? issues : undefined };
}


