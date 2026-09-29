export interface PendingPayment {
  action: 'record-payment' | 'credit' | 'pay';
  body: Record<string, string>;
}

type PendingStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const pendingPaymentStore = (storage: PendingStorage) => {
  const key = (company: string, bill: string) => `vendor-payment:${company}:${bill}`;
  return {
    read(company: string, bill: string): PendingPayment | null {
      const value = storage.getItem(key(company, bill));
      return value ? (JSON.parse(value) as PendingPayment) : null;
    },
    save(company: string, bill: string, pending: PendingPayment) {
      // Failure to persist aborts submission, preserving safe retry semantics.
      storage.setItem(key(company, bill), JSON.stringify(pending));
    },
    clear(company: string, bill: string) {
      storage.removeItem(key(company, bill));
    }
  };
};
