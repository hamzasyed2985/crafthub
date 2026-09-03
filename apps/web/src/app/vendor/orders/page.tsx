import { Suspense } from 'react';
import { PageLoader } from '@/components/page-loader';
import { Page } from '@/components/page';
import VendorOrdersClient from './orders-client';

export default function VendorOrdersPage() {
  return (
    <Suspense
      fallback={
        <Page size="wide">
          <PageLoader label="Loading orders…" />
        </Page>
      }
    >
      <VendorOrdersClient />
    </Suspense>
  );
}
