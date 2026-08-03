/** Absolute API origin for browser and Next.js server fetches. */
export function getApiBaseUrl(): string {
  let url = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}
