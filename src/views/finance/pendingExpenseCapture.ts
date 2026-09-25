type CaptureStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type CaptureKind = 'manual' | 'recurring';
export interface CapturePayload {
  [key: string]: unknown;
}
export interface CaptureRecord {
  company: string;
  kind: CaptureKind;
  payload: CapturePayload;
  recovered: boolean;
}

const key = (company: string, kind: CaptureKind) => `expense-capture:${company}:${kind}`;

export function beginCapture(storage: CaptureStorage, company: string, kind: CaptureKind, payload: CapturePayload): CaptureRecord {
  const existing = storage.getItem(key(company, kind));
  if (existing) {
    const record = JSON.parse(existing) as CaptureRecord;
    if (JSON.stringify(record.payload) !== JSON.stringify(payload))
      throw new Error('An unconfirmed capture is pending. Resolve it before starting another.');
    return { ...record, recovered: true };
  }
  const record = { company, kind, payload, recovered: false };
  storage.setItem(key(company, kind), JSON.stringify(record));
  return record;
}

export function failCapture(storage: CaptureStorage, record: CaptureRecord, status?: number) {
  if (status === 400 || status === 422) storage.removeItem(key(record.company, record.kind));
}
export function recoverCapture(storage: CaptureStorage, company: string, kind: CaptureKind): CapturePayload | null {
  const raw = storage.getItem(key(company, kind));
  return raw ? (JSON.parse(raw) as CaptureRecord).payload : null;
}
export function completeCapture(storage: CaptureStorage, record: CaptureRecord) {
  storage.removeItem(key(record.company, record.kind));
}
