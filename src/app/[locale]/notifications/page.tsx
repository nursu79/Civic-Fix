'use client';

import React, { useState, useEffect, use } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { 
  Bell, 
  Check, 
  ExternalLink, 
  Info, 
  MessageSquare, 
  ThumbsUp, 
  Trash2,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Issue } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { cn, formatNumber, formatRelativeTime, Category, Status, statuses, categories, translateNotification } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/providers';
import { Button } from '@/components/ui';

interface Notification {
  id: string;
  type: 'status_change' | 'upvote' | 'comment' | 'follow' | 'system';
  content: string;
  issue_id?: string;
  is_read: boolean;
  created_at: string;
}

interface PageParams {
  params: Promise<{ locale: string }>;
}

export default function NotificationsPage({ params }: PageParams) {
  const { locale } = use(params);
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const nt = useTranslations('notifications');
  const common = useTranslations('common');

  const fetchNotifications = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const markAsRead = async (id: string) => {
    const { error } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await (supabase as any)
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'upvote': return <ThumbsUp className="w-5 h-5 text-amber-500" />;
      case 'status_change': return <ExternalLink className="w-5 h-5 text-blue-500" />;
      case 'comment': return <MessageSquare className="w-5 h-5 text-teal-500" />;
      case 'follow': return <Bell className="w-5 h-5 text-indigo-500" />;
      default: return <Info className="w-5 h-5 text-slate-400" />;
    }
  };

  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center pt-24">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-sm w-full mx-4">
          <Bell className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-deep-navy mb-2">{nt('loginRequired')}</h1>
          <p className="text-slate-500 mb-6">{nt('loginDescription')}</p>
          <Link href={`/${locale}/login`}>
            <Button className="w-full rounded-full bg-deep-navy">{common('login')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-28 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/${locale}/dashboard`}>
            <button className="p-3 bg-white rounded-2xl border border-zinc-100 shadow-sm hover:bg-zinc-50 transition-all active:scale-95">
              <ArrowLeft className="w-5 h-5 text-deep-navy" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-deep-navy">{nt('title')}</h1>
            <p className="text-slate-500 font-medium">{nt('subtitle')}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-white rounded-[2rem] border border-zinc-100 animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-16 text-center border border-zinc-100 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="w-10 h-10 text-slate-200" />
            </div>
            <h2 className="text-xl font-bold text-deep-navy mb-2">{nt('noNotifications')}</h2>
            <p className="text-slate-500 max-w-xs mx-auto mb-8 font-medium">
              {nt('noNotificationsDesc')}
            </p>
            <Link href={`/${locale}/issues`}>
              <Button className="bg-teal-primary hover:bg-teal-600 rounded-full px-8">{nt('browseIssues')}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((n, idx) => {
              const link = n.issue_id ? `/issues/${n.issue_id}` : null;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={n.id}
                  className={cn(
                    "bg-white rounded-[2rem] p-6 border transition-all hover:shadow-xl hover:shadow-teal-900/5 group relative",
                    !n.is_read ? "border-teal-primary/20 bg-teal-primary/[0.01]" : "border-zinc-100"
                  )}
                >
                  <div className="flex gap-6">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 bg-white shadow-sm",
                      !n.is_read ? "border-teal-primary/30" : "border-zinc-100"
                    )}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0 pr-12">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-deep-navy tracking-tight">
                          {nt(`types.${n.type}`)}
                        </h4>
                        {!n.is_read && <span className="w-1.5 h-1.5 bg-teal-primary rounded-full" />}
                      </div>
                      <p className="text-slate-500 font-medium leading-relaxed mb-4">
                        {translateNotification(n.content, locale, nt)}
                      </p>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          {formatRelativeTime(n.created_at, locale)}
                        </div>
                        {link && (
                          <Link 
                            href={`/${locale}${link}`}
                            onClick={() => markAsRead(n.id)}
                            className="text-xs font-black text-teal-600 uppercase tracking-widest hover:underline"
                          >
                            {nt('viewDetails')}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!n.is_read && (
                    <button 
                      onClick={() => markAsRead(n.id)}
                      className="p-2 bg-white rounded-xl border border-zinc-100 shadow-sm text-teal-600 hover:bg-teal-50 hover:border-teal-200 transition-all"
                      title={nt('markAsRead')}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => deleteNotification(n.id)}
                    className="p-2 bg-white rounded-xl border border-zinc-100 shadow-sm text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all"
                    title={nt('delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
