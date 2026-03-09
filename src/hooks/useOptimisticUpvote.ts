'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUserSession } from './useUserSession';

interface UseOptimisticUpvoteReturn {
  upvoteCount: number;
  hasUpvoted: boolean;
  isLoading: boolean;
  toggleUpvote: () => Promise<void>;
}

/**
 * Optimistic UI for upvotes with realtime sync
 * Single Source of Truth: Database triggers update upvote_count
 */
export function useOptimisticUpvote(
  issueId: string,
  initialCount: number,
  initialHasUpvoted: boolean
): UseOptimisticUpvoteReturn {
  const { user } = useUserSession();
  const supabase = createClient();
  
  const [upvoteCount, setUpvoteCount] = useState(initialCount);
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted);
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to realtime updates for this issue's upvote count
  useEffect(() => {
    const channel = supabase
      .channel(`issue-upvotes-${issueId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'issues',
          filter: `id=eq.${issueId}`,
        },
        (payload) => {
          // Database is Single Source of Truth
          const newCount = (payload.new as any).upvote_count;
          setUpvoteCount(newCount);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [issueId, supabase]);

  const toggleUpvote = useCallback(async () => {
    if (!user) {
      throw new Error('Must be authenticated to upvote');
    }

    if (isLoading) return;

    // Optimistic UI update
    const optimisticCount = hasUpvoted ? upvoteCount - 1 : upvoteCount + 1;
    const optimisticHasUpvoted = !hasUpvoted;
    
    setUpvoteCount(optimisticCount);
    setHasUpvoted(optimisticHasUpvoted);
    setIsLoading(true);

    try {
      if (hasUpvoted) {
        // Remove upvote
        const { error } = await supabase
          .from('upvotes')
          .delete()
          .eq('issue_id', issueId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Add upvote
        const { error } = await supabase
          .from('upvotes')
          .insert({
            issue_id: issueId,
            user_id: user.id,
          } as any);

        if (error) throw error;
      }

      // Database trigger will update upvote_count
      // Realtime subscription will sync the true count
    } catch (error) {
      // Rollback optimistic update on error
      setUpvoteCount(upvoteCount);
      setHasUpvoted(hasUpvoted);
      console.error('Upvote error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, issueId, hasUpvoted, upvoteCount, isLoading, supabase]);

  return {
    upvoteCount,
    hasUpvoted,
    isLoading,
    toggleUpvote,
  };
}
