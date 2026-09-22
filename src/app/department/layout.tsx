import { AuthProvider } from '@/providers';
import '@/app/globals.css';

export default function DepartmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen antialiased bg-slate-900">
        {children}
      </div>
    </AuthProvider>
  );
}
