'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@crafthub/ui';
import { ListRowSkeleton } from '@/components/list-row-skeleton';
import { useAuth } from '@/components/auth-provider';
import { PaginationControls } from '@/components/pagination-controls';
import {
  createProductReview,
  fetchProductReviewEligibility,
  fetchProductReviews,
  type ReviewDto,
} from '@/lib/api';

export function ProductReviews({ productId }: { productId: string }) {
  const { user, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewLimit, setReviewLimit] = useState(24);
  const [avg, setAvg] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const showReviewForm = canReview && !authLoading && Boolean(user);

  useEffect(() => {
    setReviewPage(1);
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    fetchProductReviews(productId, reviewPage, 24)
      .then((res) => {
        setReviews(res.reviews);
        setReviewTotal(res.meta.total);
        setReviewLimit(res.meta.limit);
        setAvg(res.meta.averageRating);
        setReviewCount(res.meta.reviewCount);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load reviews'))
      .finally(() => setLoading(false));
  }, [productId, reviewPage]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCanReview(false);
      return;
    }
    fetchProductReviewEligibility(productId)
      .then((res) => setCanReview(res.eligible))
      .catch(() => setCanReview(false));
  }, [productId, user, authLoading]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      await createProductReview(productId, { rating, body });
      setBody('');
      setCanReview(false);
      setNote('Thanks for your review.');
      setReviewPage(1);
      const res = await fetchProductReviews(productId, 1, 24);
      setReviews(res.reviews);
      setReviewTotal(res.meta.total);
      setReviewLimit(res.meta.limit);
      setAvg(res.meta.averageRating);
      setReviewCount(res.meta.reviewCount);
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not post review');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 border-t border-border pt-10">
      <h2 className="font-display text-2xl">Reviews</h2>
      <p className="mt-1 text-sm text-subtle">
        {reviewCount > 0
          ? `Average ${avg ?? '—'} / 5 · ${reviewCount} review${reviewCount === 1 ? '' : 's'}`
          : 'No reviews yet'}
      </p>
      {error ? <p className="mt-2 text-danger">{error}</p> : null}

      {loading ? (
        <div className="mt-6">
          <ListRowSkeleton rows={4} columns={1} />
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-border pb-4">
              <p className="font-semibold">
                {r.rating}/5 · {r.user.name}
                {r.verifiedPurchase ? (
                  <span className="ml-2 text-xs font-normal text-subtle">Verified purchase</span>
                ) : null}
              </p>
              {r.body ? <p className="mt-1 text-sm text-muted">{r.body}</p> : null}
            </li>
          ))}
        </ul>
      )}

      <PaginationControls
        page={reviewPage}
        limit={reviewLimit}
        total={reviewTotal}
        onPageChange={setReviewPage}
      />

      {showReviewForm ? (
        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-3">
          <h3 className="font-display text-xl">Write a review</h3>
          <label className="block text-sm text-subtle">
            Rating
            <select
              className="mt-1 block w-full max-w-xs rounded-md border border-border bg-elevated px-3 py-2"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <textarea
            className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm"
            rows={3}
            placeholder="How was the piece?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? 'Posting…' : 'Post review'}
          </Button>
          {note ? <p className="text-sm">{note}</p> : null}
        </form>
      ) : null}
    </section>
  );
}
