import './globals.css';

import type { Metadata } from 'next';
import { Fraunces, Source_Sans_3, IBM_Plex_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import { CartProvider } from '@/components/cart-provider';
import { SiteHeader } from '@/components/site-header';
import { CartDrawer } from '@/components/cart-drawer';
import { CraftConcierge } from '@/components/craft-concierge';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display-loaded',
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body-loaded',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-loaded',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CraftHub',
    template: '%s · CraftHub',
  },
  description: 'A local-artisan multi-vendor marketplace for handmade makers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${sourceSans.variable} ${plexMono.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <SiteHeader />
              <main>{children}</main>
              <CartDrawer />
              <CraftConcierge />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
