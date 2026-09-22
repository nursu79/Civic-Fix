import { AuthProvider } from '@/providers';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import '@/app/globals.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminGuard>
        <div className="flex min-h-screen bg-slate-50">
          <AdminSidebar />
          <main className="flex-1 ml-64 min-h-screen">
            {children}
          </main>
        </div>
      </AdminGuard>
    </AuthProvider>
  );
}
