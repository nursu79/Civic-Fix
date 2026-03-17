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

const navLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/issues', label: 'Issues', icon: FileText },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#1a2744] flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-black text-base tracking-tight">CivicFix</p>
          <p className="text-teal-400 text-xs font-bold uppercase tracking-widest">Admin</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all',
                isActive
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0 text-teal-400 text-xs font-black">
            {profile?.display_name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-bold truncate">{profile?.display_name ?? 'Admin'}</p>
            <p className="text-slate-500 text-xs truncate">{profile?.username ?? ''}</p>
          </div>
        </div>
        <button
          onClick={() => void signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/5 hover:text-rose-400 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
