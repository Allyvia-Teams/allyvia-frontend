export function debounce<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

export function debouncePromise<T extends (...args: any[]) => Promise<any>>(fn: T, wait = 300) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pendingReject: ((reason?: any) => void) | null = null;
  return (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    if (timeout) clearTimeout(timeout);
    if (pendingReject) pendingReject('debounced');
    return new Promise((resolve, reject) => {
      pendingReject = reject;
      timeout = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      }, wait);
    });
  };
}
