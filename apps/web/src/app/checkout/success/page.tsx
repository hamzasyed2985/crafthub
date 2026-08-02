import { Suspense } from 'react';
import CheckoutSuccessPage from './success-client';

export default function Page() {
  return (
    <Suspense fallback={<p className="px-6 py-12 text-subtle">Loading…</p>}>
      <CheckoutSuccessPage />
    </Suspense>
  );
}
