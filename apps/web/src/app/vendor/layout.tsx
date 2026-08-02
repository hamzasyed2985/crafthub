import { SellerNav } from '@/components/seller-nav';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-64px)]">
      <SellerNav />
      {children}
    </div>
  );
}
