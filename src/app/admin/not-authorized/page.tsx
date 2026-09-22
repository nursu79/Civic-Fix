'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

export default function NotAuthorizedPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-zinc-200 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-[#1a2744]">Access Denied</h1>
          <p className="text-sm text-slate-500 font-medium">
            You do not have administrative privileges to access this area.
          </p>
        </div>

        <Link href="/en/dashboard" className="block">
          <Button className="w-full bg-[#1a2744] hover:bg-[#24355a] text-white font-bold">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Citizen Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
