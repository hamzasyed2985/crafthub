import { Page } from '@/components/page';
import { PageLoader } from '@/components/page-loader';

export default function AdminFinanceLoading() {
  return (
    <Page size="wide" y="md">
      <PageLoader label="Loading finance…" />
    </Page>
  );
}
