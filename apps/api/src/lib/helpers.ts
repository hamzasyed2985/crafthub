export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function parsePagination(query: {
  page?: unknown;
  limit?: unknown;
}): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Number(query.page) || 1);
  // Default page size 24; hard cap 100 so list endpoints stay safe at scale.
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 24));
  return { page, limit, skip: (page - 1) * limit };
}

export function routeParam(value: string | string[] | undefined, name = 'id'): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    throw new Error(`Missing route param: ${name}`);
  }
  return raw;
}
