import { Suspense } from 'react';
import { Page } from '@/components/page';
import VendorOrdersClient from './orders-client';

export default function VendorOrdersPage() {
  return (
    <Suspense
      fallback={
        <Page size="reading">
          <p className="text-subtle">Loading orders…</p>
        </Page>
      }
    >
      <VendorOrdersClient />
    </Suspense>
  );
}
