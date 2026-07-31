import Link from 'next/link';
import { Button } from '@crafthub/ui';

export default function HomePage() {
  return (
    <section
      style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem 1.5rem 4rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(115deg, color-mix(in srgb, var(--bg) 55%, transparent) 0%, color-mix(in srgb, var(--bg) 20%, transparent) 45%, transparent 70%), url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\' viewBox=\'0 0 160 160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'160\' height=\'160\' filter=\'url(%23n)\' opacity=\'0.035\'/%3E%3C/svg%3E")',
          backgroundSize: 'cover, 160px 160px',
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 720,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.75rem, 8vw, 4.5rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            margin: 0,
            color: 'var(--fg)',
          }}
        >
          CraftHub
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
            lineHeight: 1.2,
            fontWeight: 500,
            margin: 0,
            color: 'var(--fg-muted)',
          }}
        >
          Handmade finds from makers near you
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: '34rem',
            color: 'var(--fg-subtle)',
            fontSize: '1.05rem',
          }}
        >
          A marketplace for local artisans — pottery, jewelry, woodwork, and more — with shops that
          keep their craft front and center.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
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
