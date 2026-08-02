import { Suspense } from 'react';
import VendorOrdersClient from './orders-client';

export default function VendorOrdersPage() {
  return (
    <Suspense fallback={<p className="px-6 py-12 text-subtle">Loading orders…</p>}>
      <VendorOrdersClient />
    </Suspense>
  );
}
