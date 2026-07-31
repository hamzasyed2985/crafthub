'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Button } from '@crafthub/ui';
import { useEffect, useState } from 'react';

export function SiteHeader() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = (resolvedTheme ?? theme) === 'dark';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.875rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--bg-elevated) 88%, transparent)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.35rem',
          fontWeight: 600,
          letterSpacing: '-0.02em',
        }}
      >
        CraftHub
      </Link>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href="/login" style={{ fontSize: '0.95rem', color: 'var(--fg-muted)' }}>
          Log in
        </Link>
        <Link href="/register">
          <Button size="sm">Join</Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Toggle color theme"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
          {mounted ? (isDark ? 'Light' : 'Dark') : 'Theme'}
        </Button>
      </nav>
    </header>
  );
}
