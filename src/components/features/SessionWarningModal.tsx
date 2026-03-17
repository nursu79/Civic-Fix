'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTranslations } from 'next-intl';

interface SessionWarningModalProps {
  isOpen: boolean;
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionWarningModal({ isOpen, onExtend, onLogout }: SessionWarningModalProps) {
  const t = useTranslations('auth'); // Adjust if you want specific translations

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-100"
          >
            <div className="p-8 pb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-6">
                <ShieldAlert className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-black text-deep-navy mb-2 tracking-tight">
                Session Expiring Soon
              </h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                For your security, you will be automatically logged out in 2 minutes due to inactivity.
              </p>
              
              <div className="flex flex-col gap-3 w-full">
                <Button 
                  onClick={onExtend}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Stay Logged In
                </Button>
                <button
                  onClick={onLogout}
                  className="w-full text-slate-500 hover:text-red-600 text-sm font-bold h-10 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out Now
                </button>
              </div>
            </div>
            
            {/* Countdown progress bar effect */}
            <div className="w-full h-1.5 bg-slate-100 absolute bottom-0 left-0">
              <motion.div 
                className="h-full bg-teal-500"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 120, ease: "linear" }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
