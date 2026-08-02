import { Suspense } from 'react';
import { Page } from '@/components/page';
import CheckoutSuccessPage from './success-client';

export default function CheckoutSuccessRoute() {
  return (
    <Suspense
      fallback={
        <Page size="narrow">
          <p className="text-subtle">Loading…</p>
        </Page>
      }
    >
      <CheckoutSuccessPage />
    </Suspense>
  );
}
