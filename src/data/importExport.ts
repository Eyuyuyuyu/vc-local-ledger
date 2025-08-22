import type { DataSnapshot, RecordItem } from './types';

export function toJSON(snapshot: DataSnapshot): string {
  return JSON.stringify(snapshot);
}

export function fromJSON(json: string): DataSnapshot {
  return JSON.parse(json) as DataSnapshot;
}

export function recordsToCSV(records: RecordItem[]): string {
  const header = ['id', 'date', 'categoryId', 'amount', 'note', 'createdAt', 'updatedAt', 'version'];
  const lines = [header.join(',')];
  for (const r of records) {
    const row = [r.id, r.date, r.categoryId, String(r.amount), r.note ? JSON.stringify(r.note) : '', String(r.createdAt), String(r.updatedAt), String(r.version)];
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

export function csvToRecords(csv: string): RecordItem[] {
  const [headerLine, ...rows] = csv.trim().split(/\r?\n/);
  const header = headerLine.split(',');
  const index = (name: string) => header.indexOf(name);
  const out: RecordItem[] = [];
  for (const line of rows) {
    const cols = line.split(',');
    out.push({
      id: cols[index('id')],
      date: cols[index('date')],
      categoryId: cols[index('categoryId')],
      amount: Number(cols[index('amount')]),
      note: cols[index('note')] || undefined,
      createdAt: Number(cols[index('createdAt')]),
      updatedAt: Number(cols[index('updatedAt')]),
      version: Number(cols[index('version')]),
    });
  }
  return out;
}


