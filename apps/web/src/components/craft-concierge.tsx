'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button, ProductCard } from '@crafthub/ui';
import { useAuth } from '@/components/auth-provider';
import { IconChat, IconClose } from '@/components/icons';
import { askConcierge, type ConciergeProduct } from '@/lib/api';

const ANIM_MS = 220;

type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
  products?: ConciergeProduct[];
  meta?: { retrieved: number; mock: boolean };
};

const WELCOME: ChatTurn = {
  role: 'assistant',
  content:
    'Ask for a gift idea, material, or budget — I’ll recommend real CraftHub makers and pieces.',
};

export function CraftConcierge() {
  const { user, loading: authLoading } = useAuth();
  const sessionKey = authLoading ? undefined : (user?.id ?? 'guest');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([WELCOME]);

  // Chat lives in component state (layout stays mounted across routes). Reset per auth user / guest.
  useEffect(() => {
    if (sessionKey === undefined) return;
    setTurns([WELCOME]);
    setInput('');
    setError(null);
    setBusy(false);
    setOpen(false);
  }, [sessionKey]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(id);
    }

    setEntered(false);
    const t = window.setTimeout(() => setMounted(false), ANIM_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;

    setInput('');
    setBusy(true);
    setError(null);
    const nextTurns: ChatTurn[] = [...turns, { role: 'user', content: message }];
    setTurns(nextTurns);

    try {
      const res = await askConcierge(
        nextTurns
          .filter((t) => t.role === 'user' || t.content)
          .map((t) => ({ role: t.role, content: t.content })),
      );
      setTurns((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          products: res.products,
          meta: { retrieved: res.meta.retrieved, mock: res.meta.mock },
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ask failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_8px_24px_rgba(28,25,23,0.18)] transition hover:bg-accent-hover"
          aria-label="Ask"
        >
          <IconChat className="h-6 w-6" />
        </button>
      ) : null}

      {mounted ? (
        <div className="fixed inset-0 z-[30]">
          <button
            type="button"
            aria-label="Close Ask"
            className={`absolute inset-0 bg-black/40 transition-opacity duration-200 motion-reduce:transition-none ${
              entered ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setOpen(false)}
          />
          <aside
            className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-elevated shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-out motion-reduce:transition-none ${
              entered ? 'translate-x-0' : 'translate-x-full'
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Ask"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent-muted text-accent">
                  <IconChat />
                </span>
                <div>
                  <h2 className="font-display text-xl">Ask</h2>
                  <p className="text-xs text-muted">Find makers & handmade pieces</p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-background-subtle hover:text-foreground"
                aria-label="Close Ask"
                onClick={() => setOpen(false)}
              >
                <IconClose />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {turns.map((t, i) => (
                <div key={`${t.role}-${i}`} className={t.role === 'user' ? 'text-right' : ''}>
                  <div
                    className={`inline-block max-w-[95%] rounded-md px-3 py-2 text-left text-sm whitespace-pre-wrap ${
                      t.role === 'user'
                        ? 'bg-accent text-on-accent'
                        : 'border border-border bg-background-subtle text-foreground'
                    }`}
                  >
                    {t.content}
                  </div>
                  {t.meta ? (
                    <p className="mt-1 text-xs text-subtle">
                      Based on {t.meta.retrieved} catalog item{t.meta.retrieved === 1 ? '' : 's'}
                      {t.meta.mock ? ' · mock AI' : ''}
                    </p>
                  ) : null}
                  {t.products && t.products.length > 0 ? (
                    <ul className="mt-3 grid grid-cols-2 gap-3 text-left">
                      {t.products.map((p) => (
                        <li key={p.id}>
                          <ProductCard
                            href={`/shops/${p.shopSlug}/products/${p.slug}`}
                            title={p.title}
                            imageUrl={p.imageUrl}
                            priceCents={p.priceCents ?? 0}
                            currency={p.currency}
                            vendorName={p.shopName}
                            vendorHref={`/shops/${p.shopSlug}`}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
              {error ? <p className="text-sm text-danger">{error}</p> : null}
            </div>

            <form onSubmit={(e) => void onSubmit(e)} className="border-t border-border p-4">
              <label className="sr-only" htmlFor="ask-input">
                Ask about products
              </label>
              <textarea
                id="ask-input"
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. ceramic mug under $40"
                className="w-full rounded-md border border-border-strong bg-canvas px-3 py-2 text-sm text-foreground"
              />
              <div className="mt-2 flex justify-end">
                <Button type="submit" size="sm" disabled={busy || !input.trim()}>
                  {busy ? 'Thinking…' : 'Ask'}
                </Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
