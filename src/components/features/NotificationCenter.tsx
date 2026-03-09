'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, ExternalLink, Info, MessageSquare, ThumbsUp, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { cn, translateNotification } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/providers';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: 'status_change' | 'upvote' | 'comment' | 'follow' | 'system';
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const locale = useLocale();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  const nt = useTranslations('notifications');
  const npt = useTranslations('notificationsPopout');

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Real-time subscription
      const channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 10));
            setUnreadCount(count => count + 1);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const markAsRead = async (id: string) => {
    const { error } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(count => Math.max(0, count - 1));
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await (supabase as any)
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      // Re-fetch count or adjust local count
      const deletedWasUnread = notifications.find(n => n.id === id)?.is_read === false;
      if (deletedWasUnread) setUnreadCount(count => Math.max(0, count - 1));
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'upvote': return <ThumbsUp className="w-4 h-4 text-amber-500" />;
      case 'status_change': return <ExternalLink className="w-4 h-4 text-blue-500" />;
      case 'comment': return <MessageSquare className="w-4 h-4 text-teal-500" />;
      default: return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-full transition-all hover:bg-zinc-100 active:scale-95 border",
          isOpen ? "bg-zinc-100 border-zinc-200" : "bg-white border-transparent"
        )}
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-in zoom-in">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-3xl border border-zinc-100 shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/50">
                <h3 className="text-sm font-black text-deep-navy uppercase tracking-widest flex items-center gap-2">
                  {npt('title')}
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-teal-primary/10 text-teal-600 px-2 py-0.5 rounded-full">
                      {unreadCount} {npt('new')}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllRead}
                      className="text-[10px] font-bold text-teal-600 hover:underline"
                    >
                      {npt('markAllRead')}
                    </button>
                  )}
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-zinc-200 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                {notifications.length === 0 ? (
                  <div className="py-12 px-8 text-center">
                    <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-xs font-bold text-slate-400">{npt('allCaughtUp')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-50">
                    {notifications.map((n) => (
                      <div 
                        key={n.id}
                        onClick={() => {
                          setIsOpen(false);
                          markAsRead(n.id);
                          window.location.href = `/${locale}/notifications`;
                        }}
                        className={cn(
                          "p-4 transition-colors relative group cursor-pointer",
                          !n.is_read ? "bg-teal-primary/[0.02]" : "hover:bg-zinc-50"
                        )}
                      >
                        <div className="flex gap-4">
                          <div className={cn(
                            "grow-0 shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border bg-white shadow-sm",
                            !n.is_read ? "border-teal-primary/20" : "border-zinc-100"
                          )}>
                            {getIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0 pr-6">
                            <h4 className="text-xs font-black text-deep-navy truncate mb-1">
                              {nt(`types.${n.type}`)}
                            </h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                              {translateNotification(n.message, locale, nt)}
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] font-bold text-slate-300 uppercase">
                                {new Date(n.created_at).toLocaleDateString(locale === 'am' ? 'am-ET' : 'en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              {n.link && (
                                <Link 
                                  href={`/${locale}${n.link.startsWith('/') ? '' : '/'}${n.link}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    markAsRead(n.id);
                                  }}
                                  className="text-[9px] font-black text-teal-600 uppercase hover:underline"
                                >
                                  {npt('viewDetails')}
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          {!n.is_read && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(n.id);
                              }}
                              className="p-1.5 bg-white rounded-lg border border-zinc-200 shadow-sm text-teal-600 hover:bg-teal-50"
                              title={nt('markAsRead')}
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(n.id);
                            }}
                            className="p-1.5 bg-white rounded-lg border border-zinc-200 shadow-sm text-rose-500 hover:bg-rose-50"
                            title={nt('delete')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {!n.is_read && (
                          <div className="absolute top-4 right-2 w-1.5 h-1.5 bg-teal-primary rounded-full ring-2 ring-white" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-zinc-100/50 border-t border-zinc-100 text-center">
                <Link 
                  href={`/${locale}/notifications`} 
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-deep-navy transition-colors"
                >
                  {npt('seeAll')}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
