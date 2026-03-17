'use client';

export const dynamic = 'force-dynamic';

import { LayoutDashboard, FileText, Users, BarChart3, Clock } from 'lucide-react';

const KPI_PLACEHOLDERS = [
  { label: 'Open Issues', value: '—', icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50' },
  { label: 'Resolved This Week', value: '—', icon: LayoutDashboard, color: 'text-teal-600', bg: 'bg-teal-50' },
  { label: 'Avg. Resolution Time', value: '—', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
  { label: 'Active Citizens', value: '—', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
];

export default function AdminDashboardPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#1a2744] tracking-tight">Dashboard</h1>
        <p className="text-slate-500 font-medium mt-1">Welcome back. Here's what's happening in your city.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        {KPI_PLACEHOLDERS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
            <p className="text-3xl font-black text-[#1a2744]">{value}</p>
            <p className="text-sm font-bold text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
          <h2 className="text-lg font-black text-[#1a2744] mb-4">Live Issue Feed</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
          <h2 className="text-lg font-black text-[#1a2744] mb-4">Priority Queue</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-slate-50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
