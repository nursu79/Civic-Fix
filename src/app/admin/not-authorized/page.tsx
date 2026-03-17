'use client';

import Link from 'next/link';
import { ShieldX } from 'lucide-react';

export default function NotAuthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center p-10 bg-white rounded-3xl shadow-xl border border-zinc-100 max-w-sm w-full mx-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-5">
          <ShieldX className="w-8 h-8 text-rose-500" />
        </div>
        <h1 className="text-2xl font-black text-[#1a2744] mb-2">Access Denied</h1>
        <p className="text-slate-500 font-medium text-sm mb-6">
          You don't have permission to access the admin panel. Contact your administrator.
        </p>
        <Link
          href="/en"
          className="inline-flex items-center justify-center w-full bg-[#1a2744] hover:bg-[#253461] text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
        >
          Back to CivicFix
        </Link>
      </div>
    </div>
  );
}
