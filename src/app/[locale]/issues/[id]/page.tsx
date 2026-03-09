'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  MapPin, 
  ThumbsUp, 
  MessageSquare, 
  Clock, 
  Share2,
  Flag,
  CheckCircle2,
  AlertCircle,
  Send,
  MoreHorizontal,
  Copy,
  Check
} from 'lucide-react';

import { Button } from '@/components/ui';
import { cn, formatRelativeTime, formatDate, categories, Category, statuses, Status } from '@/lib/utils';
import { useIssue } from '@/hooks/useIssues';
import { createClient } from '@/lib/supabase/client';
import { FollowIssueButton } from '@/components/features/FollowIssueButton';
import { ReputationBadge } from '@/components/features/ReputationBadge';

interface PageParams {
  params: Promise<{ locale: string; id: string }>;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function IssueDetailPage({ params }: PageParams) {
  const { locale, id } = use(params);
  const t = useTranslations('issues');
  const common = useTranslations('common');
  const auth = useTranslations('auth');
  const isAmharic = locale === 'am';
  const supabase = createClient();

  // Fetch single issue data
  const { issue, isLoading, error } = useIssue(id);

  // Local state for engagement
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [showShareTooltip, setShowShareTooltip] = useState(false);

  // Initialize upvote state and Realtime subscriptions
  useEffect(() => {
    if (issue) {
      setUpvoteCount(issue.upvote_count || 0);
      
      const checkUpvote = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('upvotes')
            .select('issue_id')
            .eq('issue_id', issue.id as any)
            .eq('user_id', user.id as any)
            .single();
          
          if (data) setHasUpvoted(true);
        }
      };
      checkUpvote();
      fetchComments();

      // Setup Realtime Subscriptions
      const channel = supabase
        .channel(`issue-${issue.id}-engagement`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'comments', filter: `issue_id=eq.${issue.id}` },
          async (payload) => {
            const { data: authorData } = await supabase
              .from('profiles')
              .select('display_name, avatar_url, role')
              .eq('id', payload.new.user_id)
              .single();

            const newComment = {
              ...payload.new,
              author: authorData
            };
            
            setComments(prev => {
              if (prev.some(c => c.id === payload.new.id)) return prev;
              return [...prev, newComment];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [issue, supabase]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, author:profiles(display_name, avatar_url, role)')
      .eq('issue_id', id as any)
      .order('created_at', { ascending: true });
    
    if (data) setComments(data);
  };

  const handleUpvote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert(common('loginRequired'));

    try {
      if (hasUpvoted) {
        setHasUpvoted(false);
        setUpvoteCount(prev => prev - 1);
        await supabase.from('upvotes').delete().eq('issue_id', issue?.id as any).eq('user_id', user.id as any);
      } else {
        setHasUpvoted(true);
        setUpvoteCount(prev => prev + 1);
        await supabase.from('upvotes').insert({ issue_id: issue?.id as any, user_id: user.id as any } as any);
      }
    } catch (error) {
      // Error handled silently or via UI
    }
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim() || !issue) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert(common('loginRequired'));
      return;
    }

    const optimisticComment = {
      id: `temp-${Date.now()}`,
      issue_id: issue.id,
      user_id: user.id,
      content: newComment,
      created_at: new Date().toISOString(),
      author: {
        display_name: common('you'),
        avatar_url: null,
      }
    };

    // Optimistic UI Update
    setComments(prev => [...prev, optimisticComment]);
    const textToSubmit = newComment;
    setNewComment('');
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          issue_id: issue.id,
          user_id: user.id,
          content: textToSubmit
        } as any)
        .select('*, author:profiles(display_name, avatar_url, role)')
        .single();

      if (!error && data) {
        // Replace optimistic comment with real one
        setComments(prev => prev.map(c => c.id === optimisticComment.id ? data : c));
      } else {
        // Revert on failure
        setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
        setNewComment(textToSubmit);
        alert(`${t('commentFailed')}: ${error?.message || 'Unknown DB error'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: issue?.title || 'CivicFix Issue',
          text: issue?.description || 'Check out this issue on CivicFix',
          url: url,
        });
      } catch (err) {
        // Handle error silently
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
      } catch (err) {
        // Handle failure silently
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] pt-24 px-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
           <div className="w-full h-[400px] bg-zinc-200 rounded-[2.5rem]" />
           <div className="w-3/4 h-12 bg-zinc-200 rounded-2xl" />
           <div className="w-1/2 h-6 bg-zinc-200 rounded-lg" />
           <div className="w-full h-32 bg-zinc-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-sm w-full mx-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className={cn("text-2xl font-bold text-deep-navy mb-2", isAmharic && 'font-ethiopic')}>
            {isAmharic ? 'ችግር አልተገኘም' : 'Issue Not Found'}
          </h1>
          <Link href={`/${locale}/issues`}>
            <Button className="w-full mt-4 rounded-full bg-deep-navy">
              {common('browseIssues')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const categoryConfig = categories[issue.category as Category];
  const categoryColor = categoryConfig?.color || '#0d9488';
  const hasImage = issue.images && issue.images.length > 0;
  const coverImage = hasImage ? issue.images[0] : null;

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Immersive Dribbble Style Hero */}
      <div className="relative w-full h-[45vh] min-h-[400px] max-h-[600px] bg-zinc-100 overflow-hidden">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={issue.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full relative" style={{ backgroundColor: `${categoryColor}08` }}>
            <div 
              className="absolute inset-0 opacity-20" 
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, ${categoryColor} 2px, transparent 0)`,
                backgroundSize: '30px 30px'
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-32 h-32 rounded-[3rem] bg-white/50 backdrop-blur-xl shadow-2xl flex items-center justify-center border border-white/40 transform -rotate-6">
                 <MapPin className="w-16 h-16" style={{ color: categoryColor }} />
               </div>
            </div>
          </div>
        )}
        
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#FAFAFA]" />
        
        {/* Floating Controls */}
        <div className="absolute top-8 left-6 right-6 max-w-5xl mx-auto flex items-center justify-between z-20">
          <Link href={`/${locale}/issues`}>
            <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 text-white flex items-center justify-center hover:bg-white/30 transition-all hover:scale-105 active:scale-95 shadow-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={handleShare}
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 text-white flex items-center justify-center hover:bg-white/30 transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                {showShareTooltip ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
              </button>
              {showShareTooltip && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-deep-navy text-[10px] font-bold rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2">
                  COPIED
                </div>
              )}
            </div>
            <div 
              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 text-white flex items-center justify-center hover:bg-white/30 transition-all hover:scale-105 active:scale-95 shadow-lg group relative"
              tabIndex={0}
            >
              <MoreHorizontal className="w-5 h-5" />
              {/* Simple Placeholder Dropdown */}
              <div className="absolute top-14 right-0 w-48 bg-white rounded-2xl shadow-2xl border border-zinc-100 p-2 scale-0 group-focus:scale-100 group-active:scale-100 transition-all origin-top-right z-50 overflow-hidden">
                <button className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-zinc-50 rounded-xl transition-colors flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t('reportIssueAction')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card - Floats up over the hero */}
      <div className="max-w-4xl mx-auto px-6 sm:px-10 -mt-32 relative z-20">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
        >
          <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] border border-zinc-100/80 mb-8">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span 
                className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-md shadow-current/20"
                style={{ backgroundColor: categoryColor }}
              >
                {categoryConfig?.label[locale as 'en' | 'am'] || issue.category}
              </span>
              <span 
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm",
                  issue.status === 'open' ? "bg-amber-50 text-amber-600 border-amber-200" :
                  issue.status === 'in_progress' ? "bg-blue-50 text-blue-600 border-blue-200" :
                  "bg-emerald-50 text-emerald-600 border-emerald-200"
                )}
              >
                {statuses[issue.status as Status]?.label[locale as 'en' | 'am'] || issue.status}
              </span>
              <span 
                className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm bg-orange-50 text-orange-600 border-orange-200 flex items-center gap-1.5"
                title="Priority Score"
              >
                <Flag className="w-3.5 h-3.5" />
                {t('priority')} {issue.priority_score || 0}
              </span>
              <div className="ml-auto flex items-center gap-2 text-slate-400 text-sm font-semibold">
                <Clock className="w-4 h-4" />
                {formatRelativeTime(issue.created_at, locale)}
              </div>
            </div>

            {/* Title & Description */}
            <h1 className={cn(
              "text-3xl sm:text-5xl font-black text-deep-navy mb-6 leading-[1.1] tracking-tight",
              isAmharic && 'font-ethiopic'
            )}>
              {issue.title}
            </h1>

            <div className="flex items-start gap-4 text-slate-500 bg-zinc-50 rounded-3xl p-6 mb-8 border border-zinc-100">
               <MapPin className="w-6 h-6 shrink-0 mt-1" style={{ color: categoryColor }} />
               <p className="text-lg font-medium leading-relaxed">{issue.address || t('locationRough')}</p>
            </div>

            <p className={cn(
              "text-lg text-slate-600 leading-relaxed mb-10 whitespace-pre-wrap",
              isAmharic && 'font-ethiopic'
            )}>
              {issue.description || t('noDescription')}
            </p>

            {/* Action Bar (Upvote) */}
            <div className="flex items-center justify-between pt-8 border-t border-zinc-100">
              <div className="flex items-center gap-4">
                 <button
                    onClick={handleUpvote}
                    className={cn(
                       "flex items-center gap-3 px-6 py-3.5 rounded-full font-bold transition-all text-sm",
                       hasUpvoted 
                          ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30 border border-teal-500" 
                          : "bg-white text-slate-600 border border-slate-200 shadow-sm hover:border-teal-500/30 hover:bg-teal-50"
                    )}
                 >
                     <ThumbsUp className={cn("w-5 h-5", hasUpvoted && "fill-white")} />
                     <span>{hasUpvoted ? `${t('upvoted')} (${upvoteCount})` : `${t('upvoteAction')} ${upvoteCount > 0 ? upvoteCount : ''}`}</span>
                  </button>
                  <FollowIssueButton 
                    issueId={issue.id} 
                    initialCount={(issue as any).follow_count || 0}
                  />
              </div>

              {/* Reporter Info Mini */}
              <div className="flex items-center gap-4">
                 <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('reportedBy')}</p>
                    <div className="flex flex-col items-end">
                      <p className="text-sm font-bold text-deep-navy">{(issue as any).reporter?.display_name || issue.reporter_name || common('citizen')}</p>
                      <ReputationBadge points={(issue as any).reporter?.reputation_points || 0} />
                    </div>
                 </div>
                 <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-slate-500 border border-zinc-200 overflow-hidden shadow-inner">
                    {(issue as any).reporter?.avatar_url ? (
                      <img src={(issue as any).reporter.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      ((issue as any).reporter?.display_name || 'C').charAt(0).toUpperCase()
                    )}
                 </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Clean Message Thread (Comments) */}
        <motion.div
           initial="hidden"
           animate="visible"
           variants={fadeInUp}
           transition={{ delay: 0.1 }}
        >
           <h3 className="text-2xl font-black text-deep-navy mb-6 ml-4">{t('discussion')}</h3>
           
           <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-zinc-100/80 mb-8 space-y-6">
              {/* Input */}
              <div className="flex gap-4">
                 <div className="w-10 h-10 rounded-full bg-zinc-100 shrink-0 border border-zinc-200" />
                 <div className="flex-1">
                    <textarea 
                       placeholder={t('commentPlaceholder')}
                       value={newComment}
                       onChange={e => setNewComment(e.target.value)}
                       className="w-full bg-zinc-50 border border-zinc-200 rounded-3xl px-6 py-4 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none min-h-[100px]"
                    />
                    <div className="flex justify-end mt-3">
                       <button 
                          onClick={handleCommentSubmit}
                          disabled={isSubmitting || !newComment.trim()}
                          className="px-6 py-2.5 bg-deep-navy text-white font-bold rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                       >
                          <Send className="w-4 h-4" />
                          {t('postComment')}
                       </button>
                    </div>
                 </div>
              </div>

              {/* Thread */}
              <div className="space-y-6 pt-6 border-t border-zinc-100">
                 {comments.length > 0 ? comments.map(comment => (
                    <div key={comment.id} className="flex gap-4">
                       <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-bold shrink-0 border border-teal-100">
                          {(comment.author?.display_name || 'U').charAt(0).toUpperCase()}
                       </div>
                       <div className="flex-1 bg-zinc-50/50 rounded-2xl p-5 border border-zinc-100">
                          <div className="flex justify-between items-start mb-2">
                             <span className="font-bold text-deep-navy text-sm">{comment.author?.display_name || common('citizenUser')}</span>
                             <span className="text-xs font-semibold text-slate-400">{formatRelativeTime(comment.created_at, locale)}</span>
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed">{comment.content}</p>
                       </div>
                    </div>
                 )) : (
                    <div className="text-center py-12 px-4">
                       <MessageSquare className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                       <p className="text-slate-500 font-medium">{t('noComments')}</p>
                    </div>
                 )}
              </div>
           </div>
        </motion.div>
      </div>
    </div>
  );
}
