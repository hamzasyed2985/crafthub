import { Page } from '@/components/page';
import { PageLoader } from '@/components/page-loader';

export default function VendorLoading() {
  return (
    <Page size="wide" y="md">
      <PageLoader label="Loading seller dashboard…" />
    </Page>
  );
}
