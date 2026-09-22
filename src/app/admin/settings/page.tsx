'use client';

import { Shield, Bell } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[#1a2744] tracking-tight">System Settings</h1>
        <p className="text-slate-500 font-medium mt-1">Platform configuration & audit controls</p>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#1a2744]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1a2744]">Security Enforcement</h3>
            <p className="text-xs text-slate-500">Row Level Security (RLS) is ACTIVE on Supabase</p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-zinc-100 pt-6">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#1a2744]">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1a2744]">Realtime Dispatch Alerts</h3>
            <p className="text-xs text-slate-500">Postgres Webhooks & SMS Alerts via Africa's Talking</p>
          </div>
        </div>
      </div>
    </div>
  );
}
