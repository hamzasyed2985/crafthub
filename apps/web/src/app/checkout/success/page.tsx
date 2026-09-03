import { Suspense } from 'react';
import { PageLoader } from '@/components/page-loader';
import { Page } from '@/components/page';
import CheckoutSuccessPage from './success-client';

export default function CheckoutSuccessRoute() {
  return (
    <Suspense
      fallback={
        <Page size="narrow">
          <PageLoader label="Loading order confirmation…" />
        </Page>
      }
    >
      <CheckoutSuccessPage />
    </Suspense>
  );
}
