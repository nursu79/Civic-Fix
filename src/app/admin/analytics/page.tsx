'use client';

import { TrendingUp, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function AdminAnalyticsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[#1a2744] tracking-tight">Civic Analytics</h1>
        <p className="text-slate-500 font-medium mt-1">Resolution metrics & infrastructure category insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-3xl font-black text-[#1a2744]">94%</p>
          <p className="text-sm font-bold text-slate-400">Response Speed Metric</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-3xl font-black text-[#1a2744]">3.2 Days</p>
          <p className="text-sm font-bold text-slate-400">Avg. Resolution Time</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <p className="text-3xl font-black text-[#1a2744]">Roads & Water</p>
          <p className="text-sm font-bold text-slate-400">Top Reported Categories</p>
        </div>
      </div>
    </div>
  );
}
