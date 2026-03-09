'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Issue } from '@/lib/types';
import { Category, Status } from '@/lib/utils';

interface UseIssuesOptions {
  category?: Category | 'all';
  status?: Status;
  sort?: 'recent' | 'popular' | 'priority' | 'following';
  limit?: number;
  search?: string;
  location?: string;
}

interface UseIssuesReturn {
  issues: Issue[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  hasUpvoted: (issueId: string) => boolean;
  toggleUpvote: (issueId: string) => Promise<void>;
}

export function useIssues(options: UseIssuesOptions = {}): UseIssuesReturn & { hasMore: boolean; loadMore: () => void; totalCount: number; setPage: (page: number) => void; page: number } {
  const { category = 'all', status, sort = 'recent', limit = 12, search = '', location = '' } = options;
  
  const [issues, setIssues] = useState<Issue[]>([]);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  const supabase = createClient();
  
  const fetchIssues = useCallback(async (isLoadMore = false, targetPage?: number) => {
    setIsLoading(true);
    if (!isLoadMore && targetPage === undefined) {
      setIssues([]);
    }
    setError(null);
    
    try {
      const pageToFetch = targetPage !== undefined ? targetPage : (isLoadMore ? page + 1 : 0);
      const from = pageToFetch * limit;
      
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (status) params.set('status', status);
      params.set('sort', sort);
      params.set('limit', limit.toString());
      params.set('offset', from.toString());
      if (search) params.set('search', search);
      if (location) params.set('location', location);

      const res = await fetch(`/api/issues?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch issues from API');
      
      const responseData = await res.json();
      const { issues: fetchedIssues, count } = responseData;
      
      const data = fetchedIssues;
      
      if (count !== null && count !== undefined) setTotalCount(count);

      if (data) {
        const { data: { user } } = await supabase.auth.getUser();
        let upvotedIds = new Set<string>();
        
        if (user) {
          const { data: upvotes } = await supabase
            .from('upvotes')
            .select('issue_id')
            .eq('user_id', user.id);
          
          if (upvotes) {
            upvotedIds = new Set((upvotes as { issue_id: string }[]).map(u => u.issue_id));
          }
        }

        const mapped: Issue[] = data.map((d: any) => ({
          ...d,
          location: { lat: d.lat || 0, lng: d.lng || 0 },
          reporter_name: d.reporter?.display_name || 'Anonymous',
          has_upvoted: upvotedIds.has(d.id)
        }));

        setIssues(prev => isLoadMore ? [...prev, ...mapped] : mapped);
        setHasMore(data.length === limit);
        setPage(pageToFetch);
        if (!isLoadMore && targetPage === undefined) {
          setUserUpvotes(upvotedIds);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch issues');
    } finally {
      setIsLoading(false);
    }
  }, [category, status, sort, limit, search, location, supabase, page]);
  
  useEffect(() => {
    fetchIssues();
  }, [category, status, sort, search, location]); // Reset on filter changes
  
  // Realtime updates (only for current list)
  useEffect(() => {
    const channel = supabase
      .channel('issues-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issues' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Re-fetch count
            supabase.from('issues').select('id', { count: 'exact', head: true }).then(({ count }) => {
              if (count !== null) setTotalCount(count);
            });
            // Only add if it doesn't exist and on first page (to avoid duplicates)
            if (page === 0) {
              setIssues(prev => [payload.new as Issue, ...prev.filter(i => i.id !== payload.new.id)]);
            }
          } else if (payload.eventType === 'UPDATE') {
            setIssues(prev => 
              prev.map(i => i.id === payload.new.id ? { ...i, ...payload.new } as Issue : i)
            );
          } else if (payload.eventType === 'DELETE') {
            setIssues(prev => prev.filter(i => i.id !== payload.old.id));
            setTotalCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, page]);
  
  const hasUpvoted = (issueId: string) => userUpvotes.has(issueId);
  
  const toggleUpvote = async (issueId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Must be logged in to upvote');
    
    const alreadyUpvoted = userUpvotes.has(issueId);
    
    if (alreadyUpvoted) {
      await supabase.from('upvotes').delete().eq('issue_id', issueId).eq('user_id', user.id);
      setUserUpvotes(prev => {
        const next = new Set(prev);
        next.delete(issueId);
        return next;
      });
    } else {
      await (supabase as any).from('upvotes').insert({ issue_id: issueId, user_id: user.id });
      setUserUpvotes(prev => new Set(prev).add(issueId));
    }
  };
  
  return {
    issues,
    isLoading,
    error,
    refetch: () => fetchIssues(),
    hasMore,
    loadMore: () => fetchIssues(true),
    totalCount,
    setPage: (p: number) => fetchIssues(false, p),
    page,
    hasUpvoted,
    toggleUpvote,
  };
}

// Hook for single issue
export function useIssue(id: string) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();
  
  useEffect(() => {
    const fetchIssue = async () => {
      setIsLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('issues')
        .select(`
          *,
          reporter:profiles!reporter_id(id, display_name, avatar_url),
          comments:comments(count),
          upvotes:upvotes(count)
        `)
        .eq('id', id)
        .single();
      
      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        const typedData = data as any;
        setIssue({
          ...typedData,
          comment_count: typedData.comments?.[0]?.count ?? typedData.comment_count ?? 0,
          upvote_count: typedData.upvotes?.[0]?.count ?? typedData.upvote_count ?? 0,
          follow_count: typedData.follow_count ?? 0,
        } as Issue);
      }
      
      setIsLoading(false);
    };
    
    fetchIssue();
    
    // Subscribe to updates for this issue
    const channel = supabase
      .channel(`issue-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'issues', filter: `id=eq.${id}` },
        (payload) => {
          setIssue(prev => prev ? ({ ...prev, ...payload.new } as Issue) : (payload.new as Issue));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);
  
  return { issue, isLoading, error };
}
