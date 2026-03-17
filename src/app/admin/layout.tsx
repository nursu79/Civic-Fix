import type { Metadata } from 'next';
import '@/app/globals.css';
import { AuthProvider } from '@/providers';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const metadata: Metadata = {
  title: 'CivicFix Admin',
  description: 'CivicFix Admin Panel — Internal Operations Dashboard',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-slate-50 overflow-x-hidden">
        <AuthProvider>
          <AdminGuard>
            <div className="flex min-h-screen">
              <AdminSidebar />
              {/* Main content shifted to the right of the 256px (w-64) sidebar */}
              <main className="flex-1 ml-64 min-h-screen">
                {children}
              </main>
            </div>
          </AdminGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
