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
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-elevated/90 px-6 py-3.5 backdrop-blur-sm">
      <Link href="/" className="font-display text-[1.35rem] font-semibold tracking-[-0.02em]">
        CraftHub
      </Link>

      <nav className="flex items-center gap-3">
        <Link href="/login" className="text-[0.95rem] text-muted">
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
