'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@crafthub/ui';
import { LoadingMessage } from '@/components/loading-message';
import { LoadingOverlay } from '@/components/loading-overlay';
import { Page } from '@/components/page';
import { PageLoader } from '@/components/page-loader';
import { PaginationControls } from '@/components/pagination-controls';
import { ShopGridSkeleton } from '@/components/shop-grid-skeleton';
import { Spinner } from '@/components/spinner';
import { fetchShops } from '@/lib/api';

type ShopRow = Awaited<ReturnType<typeof fetchShops>>['data'][number];

const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;

function parsePageSize(raw: string | null): number {
  const n = Number(raw);
  if (PAGE_SIZE_OPTIONS.includes(n as (typeof PAGE_SIZE_OPTIONS)[number])) return n;
  return 24;
}

function MakersCatalog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [shops, setShops] = useState<ShopRow[]>([]);
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page')) || 1));
  const [pageSize, setPageSize] = useState(parsePageSize(searchParams.get('limit')));
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(pageSize);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const syncUrl = useCallback(
    (next: { q: string; page: number; pageSize: number }) => {
      const params = new URLSearchParams();
      if (next.q.trim()) params.set('q', next.q.trim());
      if (next.page > 1) params.set('page', String(next.page));
      if (next.pageSize !== 24) params.set('limit', String(next.pageSize));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    let cancelled = false;
    const isInitial = !hasLoadedOnceRef.current;
    if (isInitial) setInitialLoading(true);
    else setRefreshing(true);

    const params: Record<string, string> = { page: String(page), limit: String(pageSize) };
    if (q.trim()) params.q = q.trim();
    fetchShops(params)
      .then((res) => {
        if (cancelled) return;
        const nextLimit = res.meta.limit;
        const nextTotal = res.meta.total;
        const nextPageCount = Math.max(1, Math.ceil(nextTotal / Math.max(nextLimit, 1)));
        if (page > nextPageCount) {
          setPage(nextPageCount);
          syncUrl({ q, page: nextPageCount, pageSize });
          return;
        }
        setShops(res.data);
        setTotal(nextTotal);
        setLimit(nextLimit);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) {
          setInitialLoading(false);
          setRefreshing(false);
          hasLoadedOnceRef.current = true;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [q, page, pageSize, syncUrl]);

  function updatePage(next: number) {
    setPage(next);
    syncUrl({ q, page: next, pageSize });
  }

  function updatePageSize(next: number) {
    setPageSize(next);
    setPage(1);
    syncUrl({ q, page: 1, pageSize: next });
  }

  return (
    <Page size="wide" y="md">
      <h1 className="font-display text-3xl">Makers</h1>
      <p className="mt-2 max-w-2xl text-muted">
        <strong className="font-semibold text-foreground">Makers</strong> are the artisans who sell
        on CraftHub — potters, jewelers, woodworkers, textile artists, and food crafters. Each maker
        runs their own shop, sets their own prices, and ships what they make. CraftHub is the
        marketplace that connects you to them.
      </p>

      <div className="mt-6 grid gap-4 border-t border-border pt-6 text-sm text-muted sm:grid-cols-3">
        <p>
          <span className="font-semibold text-foreground">Not a big-box store.</span> You’re buying
          from a person or small studio, not a warehouse brand.
        </p>
        <p>
          <span className="font-semibold text-foreground">One cart, many shops.</span> You can
          checkout items from several makers together; each maker fulfills their own pieces.
        </p>
        <p>
          <span className="font-semibold text-foreground">Browse products too.</span>{' '}
          <Link href="/explore" className="text-accent hover:underline">
            Explore
          </Link>{' '}
          lists individual handmade goods. This page is for finding the people behind them.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="min-h-11 w-full max-w-md rounded-sm border border-border-strong bg-elevated px-3"
          placeholder="Search by name, city, or craft…"
          value={q}
          onChange={(e) => {
            const next = e.target.value;
            setQ(next);
            setPage(1);
            syncUrl({ q: next, page: 1, pageSize });
          }}
          aria-label="Search makers"
        />
        <Link href="/vendor/apply" className="shrink-0">
          <Button variant="secondary" size="sm">
            Become a maker
          </Button>
        </Link>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-muted">
        {initialLoading ? (
          <LoadingMessage label="Loading makers…" />
        ) : (
          <>
            <span>
              {total} approved maker{total === 1 ? '' : 's'}
              {q.trim() ? ' matching your search' : ''}
            </span>
            {refreshing ? <Spinner size="sm" label="Updating makers" /> : null}
          </>
        )}
      </div>

      {error ? <p className="mt-4 text-danger">{error}</p> : null}

      {initialLoading ? (
        <div className="mt-6">
          <ShopGridSkeleton count={pageSize} />
        </div>
      ) : shops.length === 0 ? (
        <p className="mt-10 text-muted">No makers match that search. Try another city or craft word.</p>
      ) : (
        <div className="relative mt-6">
          {refreshing ? <LoadingOverlay label="Updating makers…" /> : null}
          <ul
            className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${
              refreshing ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            {shops.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/shops/${s.slug}`}
                  className="flex h-full flex-col gap-3 rounded-md border border-border bg-elevated/50 p-4 transition-colors hover:border-accent"
                >
                  <div className="flex items-start gap-3">
                    {s.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-muted font-display text-lg text-accent">
                        {s.displayName.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-display text-xl leading-tight">{s.displayName}</p>
                      {s.city ? <p className="mt-0.5 text-sm text-muted">{s.city}</p> : null}
                    </div>
                  </div>
                  {s.bio ? <p className="line-clamp-3 text-sm text-subtle">{s.bio}</p> : null}
                  {s.craftTags && s.craftTags.length > 0 ? (
                    <p className="mt-auto text-xs text-muted">
                      {s.craftTags.slice(0, 4).join(' · ')}
                    </p>
                  ) : null}
                  <span className="text-sm text-accent">Visit shop →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <PaginationControls
        variant="catalog"
        page={page}
        limit={limit}
        total={total}
        onPageChange={updatePage}
        pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
        onPageSizeChange={updatePageSize}
        showPageJump
        showFirstLast
      />
    </Page>
  );
}

export default function ShopsPage() {
  return (
    <Suspense
      fallback={
        <Page size="wide" y="md">
          <PageLoader label="Loading makers…" />
        </Page>
      }
    >
      <MakersCatalog />
    </Suspense>
  );
}
