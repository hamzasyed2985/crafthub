import { Page } from '@/components/page';
import { PageLoader } from '@/components/page-loader';

export default function AccountLoading() {
  return (
    <Page size="wide" y="md">
      <PageLoader label="Loading account…" />
    </Page>
  );
}
