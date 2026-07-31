import Link from 'next/link';
import { Button } from '@crafthub/ui';

export default function HomePage() {
  return (
    <section className="relative grid min-h-[calc(100vh-64px)] place-items-center overflow-hidden px-6 pb-16 pt-8">
      <div aria-hidden className="hero-atmosphere absolute inset-0 z-0" />

      <div className="relative z-[1] flex max-w-3xl flex-col items-center gap-5 text-center">
        <p className="m-0 font-display text-[clamp(2.75rem,8vw,4.5rem)] leading-[1.05] tracking-[-0.03em] text-foreground">
          CraftHub
        </p>
        <h1 className="m-0 font-display text-[clamp(1.5rem,3.5vw,2rem)] font-medium leading-tight text-muted">
          Handmade finds from makers near you
        </h1>
        <p className="m-0 max-w-[34rem] text-[1.05rem] text-subtle">
          A marketplace for local artisans — pottery, jewelry, woodwork, and more — with shops that
          keep their craft front and center.
        </p>
        <div className="mt-2 flex gap-3">
          <Link href="/explore">
            <Button>Explore makers</Button>
          </Link>
          <Link href="/register">
            <Button variant="secondary">Sell on CraftHub</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
