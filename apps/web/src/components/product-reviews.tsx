'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@crafthub/ui';
import { useAuth } from '@/components/auth-provider';
import {
  createProductReview,
  fetchProductReviews,
  type ReviewDto,
} from '@/lib/api';

export function ProductReviews({
  productId,
  canReview = false,
}: {
  productId: string;
  canReview?: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [avg, setAvg] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // Wait for auth before showing the form so SSR and first client render match.
  const showReviewForm = canReview && !authLoading && Boolean(user);

  async function load() {
    try {
      const res = await fetchProductReviews(productId);
      setReviews(res.reviews);
      setAvg(res.meta.averageRating);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      await createProductReview(productId, { rating, body });
      setBody('');
      setNote('Thanks for your review.');
      await load();
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
        {avg != null ? `Average ${avg} / 5 · ${reviews.length} review(s)` : 'No reviews yet'}
      </p>
      {error ? <p className="mt-2 text-danger">{error}</p> : null}

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
