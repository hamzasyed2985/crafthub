import { AdminNav } from '@/components/admin-nav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-64px)]">
      <AdminNav />
      {children}
    </div>
  );
}
