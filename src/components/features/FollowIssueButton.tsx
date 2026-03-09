'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers';

interface FollowIssueButtonProps {
  issueId: string;
  className?: string;
  initialCount?: number;
}

export function FollowIssueButton({ issueId, className, initialCount = 0 }: FollowIssueButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkIfFollowing = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('issue_follows')
        .select('id')
        .eq('issue_id', issueId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setIsFollowing(true);
      }
      setIsLoading(false);
    };

    checkIfFollowing();
  }, [issueId, user]);

  const toggleFollow = async () => {
    if (!user) return;
    setIsLoading(true);

    if (isFollowing) {
      console.log("Unfollowing issue:", issueId);
      const { error } = await supabase
        .from('issue_follows')
        .delete()
        .eq('issue_id', issueId)
        .eq('user_id', user.id);

      if (!error) {
        setIsFollowing(false);
        setCount(prev => Math.max(0, prev - 1));
      } else {
        console.error("Failed to unfollow:", error);
      }
    } else {
      console.log("Attempting to follow issue:", { issueId, userId: user.id });
      const { error } = await (supabase as any)
        .from('issue_follows')
        .insert([{
          issue_id: issueId,
          user_id: user.id
        }]);

      if (!error) {
        setIsFollowing(true);
        setCount(prev => prev + 1);
      } else {
        console.error("Failed to follow:", error.message || error, error.details || "");
        alert(`Failed to follow: ${error.message || 'Unknown error'}`);
      }
    }
    setIsLoading(false);
  };

  if (!user) return null;

  return (
    <button
      onClick={toggleFollow}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all active:scale-95",
        isFollowing 
          ? "bg-teal-50 border-teal-primary/20 text-teal-700 font-bold" 
          : "bg-white border-zinc-200 text-slate-500 hover:border-zinc-300",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <BookmarkCheck className="w-4 h-4 fill-teal-primary text-teal-primary" />
      ) : (
        <Bookmark className="w-4 h-4" />
      )}
      <span className="text-xs uppercase tracking-widest font-black">
        {isFollowing ? `Following (${count})` : `Follow Updates ${count > 0 ? count : ''}`}
      </span>
    </button>
  );
}
