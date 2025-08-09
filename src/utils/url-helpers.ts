export function updateQueryParam(url: string, param: string, value: string): string {
  const urlObj = new URL(url);

  urlObj.searchParams.set(param, value);
  return urlObj.toString();
}
