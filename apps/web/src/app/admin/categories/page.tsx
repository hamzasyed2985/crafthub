'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input } from '@crafthub/ui';
import { ListRowSkeleton } from '@/components/list-row-skeleton';
import { Page } from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import {
  createAdminCategory,
  fetchAdminCategories,
  fetchAdminCategorySuggestions,
  reviewAdminCategorySuggestion,
  updateAdminCategory,
  type AdminCategoryRow,
  type AdminCategorySuggestionRow,
} from '@/lib/api';
import { toSlug } from '@/lib/slug';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategoryRow[] | null>(null);
  const [suggestions, setSuggestions] = useState<AdminCategorySuggestionRow[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(48);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [featured, setFeatured] = useState(true);
  const [creating, setCreating] = useState(false);

  async function reload() {
    setError(null);
    const [cats, sugg] = await Promise.all([
      fetchAdminCategories(statusFilter === 'all' ? undefined : statusFilter, page, 48),
      fetchAdminCategorySuggestions('pending', 1, 24),
    ]);
    setCategories(cats.data);
    setTotal(cats.meta.total);
    setLimit(cats.meta.limit);
    setSuggestions(sugg.data);
  }

  useEffect(() => {
    setCategories(null);
    reload().catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    setError(null);
    try {
      await createAdminCategory({
        name,
        slug: slug || undefined,
        featured,
        sortOrder: 50,
      });
      setName('');
      setSlug('');
      setSlugManual(false);
      setMessage('Category created.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  async function toggleFeatured(row: AdminCategoryRow) {
    setError(null);
    try {
      await updateAdminCategory(row.id, { featured: !row.featured });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function toggleArchive(row: AdminCategoryRow) {
    setError(null);
    try {
      await updateAdminCategory(row.id, {
        status: row.status === 'active' ? 'archived' : 'active',
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function review(
    id: string,
    decision: 'approved' | 'rejected',
    proposedName: string,
  ) {
    setError(null);
    setMessage(null);
    try {
      await reviewAdminCategorySuggestion(id, {
        decision,
        name: decision === 'approved' ? proposedName : undefined,
        featured: decision === 'approved',
      });
      setMessage(decision === 'approved' ? 'Suggestion approved — category created.' : 'Suggestion rejected.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
    }
  }

  return (
    <Page size="wide">
      <h1 className="font-display text-3xl">Categories</h1>
      <p className="mt-1 text-muted">
        Platform craft taxonomy for Explore. Vendors pick these per product; they cannot invent new ones.
      </p>

      {error ? <p className="mt-4 text-danger">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}

      <section className="mt-8 rounded-md border border-border p-4">
        <h2 className="font-display text-xl">Add category</h2>
        <form onSubmit={onCreate} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugManual) setSlug(toSlug(e.target.value));
            }}
          />
          <Input
            label="Slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugManual(true);
              setSlug(e.target.value);
            }}
          />
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            Featured on home
          </label>
          <div className="flex items-end">
            <Button type="submit" loading={creating}>
              Create
            </Button>
          </div>
        </form>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl">Pending suggestions</h2>
        </div>
        {!suggestions ? <ListRowSkeleton rows={3} columns={1} /> : null}
        {suggestions && suggestions.length === 0 ? (
          <p className="mt-3 text-sm text-subtle">No pending craft suggestions.</p>
        ) : null}
        {suggestions && suggestions.length > 0 ? (
          <ul className="mt-4 divide-y divide-border text-sm">
            {suggestions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{s.proposedName}</p>
                  <p className="text-muted">
                    from {s.vendor.displayName}
                    {s.note ? ` · ${s.note}` : ''}
                  </p>
                  <p className="text-subtle">{new Date(s.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void review(s.id, 'approved', s.proposedName)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void review(s.id, 'rejected', s.proposedName)}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl">All categories</h2>
          <div className="flex gap-2">
            {(['all', 'active', 'archived'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`rounded-md border px-3 py-1.5 text-sm capitalize ${
                  statusFilter === s ? 'border-accent bg-accent-muted' : 'border-border'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {!categories ? <ListRowSkeleton rows={8} columns={1} /> : null}

        {categories && categories.length > 0 ? (
          <ul className="mt-4 divide-y divide-border text-sm">
            {categories.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">
                    {c.name}{' '}
                    <span className="font-normal text-subtle">/{c.slug}</span>
                  </p>
                  <p className="text-muted">
                    {c.status}
                    {c.featured ? ' · featured on home' : ''}
                    {typeof c.productCount === 'number' ? ` · ${c.productCount} products` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void toggleFeatured(c)}>
                    {c.featured ? 'Unfeature' : 'Feature'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void toggleArchive(c)}>
                    {c.status === 'active' ? 'Archive' : 'Restore'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {categories ? (
          <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
        ) : null}
      </section>
    </Page>
  );
}
