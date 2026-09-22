'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  BarChart3, 
  Settings,
  LogOut,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers';
import { createClient } from '@/lib/supabase/client';

const navLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/issues', label: 'Issues', icon: FileText },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const handleAdminLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Admin logout error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        document.cookie = 'sb-user-role=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {}
        window.location.href = '/en/login';
      }
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-[#e2f7ee] via-[#e8f8f2] to-[#d8f4ea] backdrop-blur-md border-r border-teal-200/90 flex flex-col z-50 shadow-md shadow-teal-900/5">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-teal-200/70 bg-white/40">
        <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-teal-600/30">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[#122238] font-black text-base tracking-tight">CivicFix</p>
          <span className="text-teal-800 text-[10px] font-black uppercase tracking-wider bg-teal-200/70 px-2 py-0.5 rounded-md border border-teal-300/50">
            Admin Panel
          </span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200',
                isActive
                  ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-600/30'
                  : 'text-slate-700 font-semibold hover:bg-teal-100/70 hover:text-teal-900'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-white' : 'text-slate-500')} />
              <span className={cn('text-sm tracking-tight', isActive ? 'text-white font-bold' : 'text-slate-700 font-semibold')}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-teal-100/80 space-y-2">
        <div className="flex items-center gap-3 px-3 py-3 bg-white/80 border border-teal-100 rounded-xl shadow-xs">
          <div className="w-8 h-8 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center shrink-0 text-teal-800 text-xs font-black">
            {profile?.display_name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-[#1a2744] text-xs font-bold truncate">{profile?.display_name ?? 'Admin'}</p>
            <p className="text-slate-400 text-[11px] truncate">{profile?.username ?? 'System Admin'}</p>
          </div>
        </div>

        {/* Fresh Standalone Logout Button */}
        <button
          type="button"
          onClick={handleAdminLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white transition-all border border-rose-200 cursor-pointer shadow-xs group"
        >
          <LogOut className="w-4 h-4 text-rose-600 group-hover:text-white transition-colors" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
