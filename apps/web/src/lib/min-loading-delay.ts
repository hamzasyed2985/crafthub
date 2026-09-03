/** Optional minimum GET loading visibility for demos. Set NEXT_PUBLIC_MIN_LOADING_MS to enable. */
export const MIN_LOADING_MS = Number(process.env.NEXT_PUBLIC_MIN_LOADING_MS ?? 0);

export async function withMinLoadingDelay<T>(
  promise: Promise<T>,
  ms: number = MIN_LOADING_MS,
  startedAt: number = Date.now(),
): Promise<T> {
  if (ms <= 0) return promise;

  const [result] = await Promise.all([
    promise,
    new Promise<void>((resolve) => {
      const elapsed = Date.now() - startedAt;
      setTimeout(resolve, Math.max(0, ms - elapsed));
    }),
  ]);
  return result;
}
