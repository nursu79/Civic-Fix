'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { 
  FileText, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  X, 
  MapPin, 
  ThumbsUp, 
  Calendar,
  Sparkles,
  RefreshCw,
  ShieldAlert,
  MessageSquare,
  Send,
  CheckCheck,
  Edit3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime, categories, statuses, Category, Status } from '@/lib/utils';
import { Button, StatusBadge } from '@/components/ui';
import { NotificationCenter } from '@/components/features/NotificationCenter';

interface AdminIssue {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  status: Status;
  priority_score: number;
  lat: number | null;
  lng: number | null;
  address: string | null;
  images: string[];
  reporter_id: string;
  reporter_name?: string;
  upvote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  escalated?: boolean;
  escalation_notes?: string | null;
  escalation_admin_response?: string | null;
}

interface Stats {
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  totalCitizens: number;
}

function AdminDashboardContent() {
  const [stats, setStats] = useState<Stats>({ openCount: 0, inProgressCount: 0, resolvedCount: 0, totalCitizens: 0 });
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const [priorityQueue, setPriorityQueue] = useState<AdminIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Issue for Status Update Modal
  const [selectedIssue, setSelectedIssue] = useState<AdminIssue | null>(null);
  const [newStatus, setNewStatus] = useState<Status>('open');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [adminNote, setAdminNote] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'escalations'>('overview');

  // Escalation Response State
  const [respondingEscalation, setRespondingEscalation] = useState<any | null>(null);
  const [adminResponse, setAdminResponse] = useState<string>('');
  const [isResponding, setIsResponding] = useState(false);
  const [expandedEscalations, setExpandedEscalations] = useState<Record<string, boolean>>({});

  // Sync activeTab with URL query parameter (e.g. ?tab=escalations)
  const searchParams = useSearchParams();
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'overview' || tabParam === 'escalations') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch('/api/issues?limit=100&sort=recent');
      if (res.ok) {
        const data = await res.json();
        if (data.issues) {
          const formatted: AdminIssue[] = data.issues.map((item: any) => ({
            ...item,
            reporter_name: item.reporter?.display_name || 'Anonymous Citizen',
          }));
          setIssues(formatted);

          // Top Priority Items (sorted by priority_score)
          const sortedByPriority = [...formatted].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)).slice(0, 5);
          setPriorityQueue(sortedByPriority);

          // Calculate KPI stats directly from data for 0ms network delay & 0 hanging queries
          const open = formatted.filter((i) => i.status === 'open').length;
          const inProgress = formatted.filter((i) => i.status === 'in_progress').length;
          const resolved = formatted.filter((i) => i.status === 'resolved' || i.status === 'closed').length;
          const uniqueReporters = new Set(formatted.map((i) => i.reporter_id)).size;

          setStats({
            openCount: open,
            inProgressCount: inProgress,
            resolvedCount: resolved,
            totalCitizens: uniqueReporters || formatted.length,
          });
        }
      } else {
        console.error('Admin API fetch status error:', res.status);
      }
    } catch (err) {
      console.error('Admin dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Supabase real-time WebSocket subscription for zero-delay updates without HTTP log spam
    const channel = supabase
      .channel('admin-dashboard-issues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
        fetchData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, supabase]);

  // Handle Status Update Submission
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      const res = await fetch(`/api/issues/${selectedIssue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          assigned_to: assignedTo || null,
          note: adminNote || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update issue status');
      }

      setUpdateMessage({ type: 'success', text: `Issue status updated to ${newStatus.replace('_', ' ')}!` });
      
      // Update local state immediately
      setIssues(prev =>
        prev.map(i => (i.id === selectedIssue.id ? { ...i, status: newStatus } : i))
      );
      setSelectedIssue(prev => prev ? { ...prev, status: newStatus } : null);

      // Refresh list in background
      fetchData(true);

      setTimeout(() => {
        setSelectedIssue(null);
        setUpdateMessage(null);
        setAdminNote('');
      }, 1200);
    } catch (err: any) {
      setUpdateMessage({ type: 'error', text: err.message || 'Update failed' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter logic
  const filteredIssues = issues.filter(issue => {
    if (statusFilter !== 'all' && issue.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && issue.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = issue.title.toLowerCase().includes(q);
      const matchDesc = issue.description?.toLowerCase().includes(q);
      const matchAddr = issue.address?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAddr) return false;
    }
    return true;
  });

  // Escalated Issues
  const escalatedIssues = useMemo(() => {
    return issues.filter((i: any) => i.escalated);
  }, [issues]);

  const pendingEscalations = escalatedIssues.filter((i: any) => !i.escalation_admin_response);
  const respondedEscalations = escalatedIssues.filter((i: any) => i.escalation_admin_response);

  // Handle Admin Escalation Response
  const handleEscalationResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingEscalation || !adminResponse.trim()) return;
    setIsResponding(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const sessionRes = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null } }>(res => setTimeout(() => res({ data: { session: null } }), 100))
        ]);
        if (sessionRes?.data?.session?.access_token) {
          headers['Authorization'] = `Bearer ${sessionRes.data.session.access_token}`;
        }
      } catch (e) {
        console.warn('Session header resolution bypassed:', e);
      }

      const res = await fetch(`/api/issues/${respondingEscalation.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ escalation_admin_response: adminResponse.trim() }),
      });
      if (!res.ok) throw new Error('Response failed');
      setRespondingEscalation(null);
      setAdminResponse('');
      setUpdateMessage(null);
      fetchData(true);
    } catch {
      setUpdateMessage({ type: 'error', text: 'Failed to send response' });
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="relative z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1a2744] tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">Real-time civic issue management & dispatch</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="self-start sm:self-auto border-zinc-200 text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Feed
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${
            activeTab === 'overview'
              ? 'bg-[#1a2744] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Issue Overview
        </button>
        <button
          onClick={() => setActiveTab('escalations')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${
            activeTab === 'escalations'
              ? 'bg-[#1a2744] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" /> Escalation Center
          {pendingEscalations.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white ml-1">
              {pendingEscalations.length}
            </span>
          )}
        </button>
      </div>

      {/* ESCALATION CENTER TAB */}
      {activeTab === 'escalations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-[#1a2744] flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-600" /> Escalation Command Center
              </h2>
              <p className="text-sm text-slate-500">Respond to sector officer escalations and reallocate resources</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-200">
                {pendingEscalations.length} Awaiting Response
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
                {respondedEscalations.length} Responded
              </span>
            </div>
          </div>

          {/* Update Message Toast */}
          {updateMessage && (
            <div className={`p-4 rounded-2xl border font-bold text-sm flex items-center gap-2 ${
              updateMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {updateMessage.text}
            </div>
          )}

          {escalatedIssues.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-2">
              <CheckCheck className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-[#1a2744]">No Escalated Issues</h3>
              <p className="text-xs text-slate-500">All sector officers are handling their queues autonomously.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending Responses */}
              {pendingEscalations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Awaiting Admin Response
                  </h3>
                  {pendingEscalations.map((issue: any) => (
                    <div key={issue.id} className="bg-white rounded-2xl p-6 border border-rose-200/80 shadow-sm space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={issue.status} />
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {issue.category}
                            </span>
                            {issue.address && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {issue.address}
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-[#1a2744] truncate">{issue.title}</h3>
                        </div>
                        <button
                          onClick={() => {
                            setRespondingEscalation(issue);
                            setAdminResponse('');
                          }}
                          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1a2744] text-white text-xs font-black hover:bg-slate-700 transition-colors shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Respond
                        </button>
                      </div>

                      {/* Collapsible Escalation Thread Drawer */}
                      <div className="border border-rose-200/80 bg-rose-50/40 rounded-2xl overflow-hidden transition-all">
                        <button
                          type="button"
                          onClick={() => setExpandedEscalations(prev => ({ ...prev, [issue.id]: !prev[issue.id] }))}
                          className="w-full px-4 py-2 flex items-center justify-between text-xs font-bold text-rose-900 hover:bg-rose-100/50 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                            Officer Escalation Note
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                            {expandedEscalations[issue.id] ? 'Hide Note' : 'View Escalation Note'}
                            {expandedEscalations[issue.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </button>

                        {expandedEscalations[issue.id] && (
                          <div className="p-3.5 pt-2 border-t border-rose-200/60 bg-white/70 animate-in fade-in slide-in-from-top-1">
                            <p className="text-xs font-medium text-rose-900">{issue.escalation_notes || 'Requesting System Admin priority review.'}</p>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 font-bold">
                        Escalated {formatRelativeTime(issue.updated_at)} · Reported by {issue.reporter_name || 'Citizen'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Already Responded */}
              {respondedEscalations.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCheck className="w-3.5 h-3.5" /> Admin Responded
                  </h3>
                  {respondedEscalations.map((issue: any) => (
                    <div key={issue.id} className="bg-white rounded-2xl p-6 border border-emerald-200/80 shadow-sm space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={issue.status} />
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              ✓ Responded
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-[#1a2744] truncate">{issue.title}</h3>
                        </div>
                        <button
                          onClick={() => {
                            setRespondingEscalation(issue);
                            setAdminResponse(issue.escalation_admin_response || '');
                          }}
                          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Update Reply
                        </button>
                      </div>

                      {/* Collapsible Escalation Thread Drawer */}
                      <div className="border border-emerald-200/80 bg-emerald-50/40 rounded-2xl overflow-hidden transition-all">
                        <button
                          type="button"
                          onClick={() => setExpandedEscalations(prev => ({ ...prev, [issue.id]: !prev[issue.id] }))}
                          className="w-full px-4 py-2 flex items-center justify-between text-xs font-bold text-emerald-900 hover:bg-emerald-100/50 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
                            Escalation Thread
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Admin Responded
                            </span>
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            {expandedEscalations[issue.id] ? 'Hide Thread' : 'View Thread Details'}
                            {expandedEscalations[issue.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </button>

                        {expandedEscalations[issue.id] && (
                          <div className="p-3.5 pt-2 border-t border-emerald-200/60 space-y-2.5 bg-white/70 animate-in fade-in slide-in-from-top-1">
                            {issue.escalation_notes && (
                              <div className="p-3 bg-purple-50/90 border border-purple-200 rounded-xl text-xs space-y-1">
                                <p className="font-bold text-purple-900 flex items-center gap-1.5">
                                  <ShieldAlert className="w-3.5 h-3.5 text-purple-600" /> Officer Escalation Note:
                                </p>
                                <p className="text-purple-800 font-medium">{issue.escalation_notes}</p>
                              </div>
                            )}

                            {issue.escalation_admin_response && (
                              <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs space-y-1">
                                <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Admin Response:
                                </p>
                                <p className="text-emerald-800 font-bold">{issue.escalation_admin_response}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>{/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              Action Required
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-black text-[#1a2744]">{isLoading ? '—' : stats.openCount}</p>
          <p className="text-sm font-bold text-slate-500 mt-1">Open Issues</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              In Progress
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-black text-[#1a2744]">{isLoading ? '—' : stats.inProgressCount}</p>
          <p className="text-sm font-bold text-slate-500 mt-1">Under Dispatch</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              Resolved
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-black text-[#1a2744]">{isLoading ? '—' : stats.resolvedCount}</p>
          <p className="text-sm font-bold text-slate-500 mt-1">Closed Reports</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
              Community
            </span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-black text-[#1a2744]">{isLoading ? '—' : stats.totalCitizens}</p>
          <p className="text-sm font-bold text-slate-500 mt-1">Active Reporters</p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Live Feed & Filters (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search issues by title, description, address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-zinc-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-zinc-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="all">All Categories</option>
                {Object.entries(categories).map(([key, cat]) => (
                  <option key={key} value={key}>{cat.label.en}</option>
                ))}
              </select>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1">
              {[
                { id: 'all', label: 'All Statuses' },
                { id: 'open', label: 'Open' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'resolved', label: 'Resolved' },
                { id: 'closed', label: 'Closed' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase transition-all whitespace-nowrap ${
                    statusFilter === s.id
                      ? 'bg-[#1a2744] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-black text-[#1a2744]">Live Issues Feed</h2>
              <span className="text-xs font-bold text-slate-500">Showing {filteredIssues.length} issues</span>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white rounded-2xl p-6 border border-zinc-200 animate-pulse h-36" />
                ))}
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-zinc-200 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#1a2744]">No issues match your criteria</h3>
                <p className="text-sm text-slate-500 mt-1">Try resetting search query or status filter.</p>
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm hover:border-teal-500/50 transition-all space-y-4 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white"
                          style={{ backgroundColor: categories[issue.category]?.color || '#0D9488' }}
                        >
                          {categories[issue.category]?.label.en || issue.category}
                        </span>
                        <StatusBadge status={issue.status} />
                        <span className="text-xs font-bold text-slate-400">
                          Score: <span className="text-slate-800 font-black">{Math.round(issue.priority_score)}</span>
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#1a2744] group-hover:text-teal-600 transition-colors">
                        {issue.title}
                      </h3>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedIssue(issue);
                        setNewStatus(issue.status);
                        setUpdateMessage(null);
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold shrink-0 shadow-sm"
                    >
                      Manage
                    </Button>
                  </div>

                  {/* Collapsible Escalation Thread Drawer */}
                  {issue.escalated && (
                    <div className="border border-purple-200/80 bg-purple-50/40 rounded-2xl overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => setExpandedEscalations(prev => ({ ...prev, [issue.id]: !prev[issue.id] }))}
                        className="w-full px-4 py-2 flex items-center justify-between text-xs font-bold text-purple-900 hover:bg-purple-100/50 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0" />
                          Escalation Thread
                          {issue.escalation_admin_response ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Responded
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300">
                              Requires Response
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-700">
                          {expandedEscalations[issue.id] ? 'Hide Thread' : 'View Thread Details'}
                          {expandedEscalations[issue.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </button>

                      {expandedEscalations[issue.id] && (
                        <div className="p-3.5 pt-2 border-t border-purple-200/60 space-y-2.5 bg-white/70 animate-in fade-in slide-in-from-top-1">
                          {issue.escalation_notes && (
                            <div className="p-3 bg-purple-50/90 border border-purple-200 rounded-xl text-xs space-y-1">
                              <p className="font-bold text-purple-900 flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-purple-600" /> Officer Escalation Note:
                              </p>
                              <p className="text-purple-800 font-medium">{issue.escalation_notes}</p>
                            </div>
                          )}

                          {issue.escalation_admin_response && (
                            <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs space-y-1">
                              <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Your Admin Response:
                              </p>
                              <p className="text-emerald-800 font-bold">{issue.escalation_admin_response}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer Meta */}
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-3 border-t border-zinc-100 flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      {issue.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {issue.address}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {issue.reporter_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 font-bold text-slate-700">
                        <ThumbsUp className="w-3.5 h-3.5 text-teal-600" />
                        {issue.upvote_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatRelativeTime(issue.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Priority Queue Sidebar (1 col) */}
        <div className="space-y-6">
          <div className="bg-gradient-to-b from-teal-50/60 to-emerald-50/40 rounded-2xl p-6 border border-teal-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <h2 className="text-lg font-black text-[#1a2744]">Priority Queue</h2>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500">
              Ranked by category urgency, community upvotes, and report duration.
            </p>

            <div className="space-y-3 pt-1">
              {priorityQueue.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedIssue(item);
                    setNewStatus(item.status);
                    setUpdateMessage(null);
                  }}
                  className="bg-white hover:border-teal-300 border border-teal-100/80 rounded-xl p-4 cursor-pointer transition-all space-y-2.5 shadow-xs hover:shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200/60">
                      #{idx + 1} Priority ({Math.round(item.priority_score)})
                    </span>
                    <span className="text-xs font-bold text-slate-500">{categories[item.category]?.label.en}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#1a2744] group-hover:text-teal-600 transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-500">{item.upvote_count} upvotes</span>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Status Update Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md">
                  Update Issue Status
                </span>
                <h3 className="text-xl font-black text-[#1a2744] mt-2">{selectedIssue.title}</h3>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {updateMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-bold ${
                  updateMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {updateMessage.text}
              </div>
            )}

            {/* Issue Preview Details */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs text-slate-600">
              <p><strong className="text-slate-900">Reporter:</strong> {selectedIssue.reporter_name}</p>
              {selectedIssue.address && <p><strong className="text-slate-900">Location:</strong> {selectedIssue.address}</p>}
              {selectedIssue.description && <p><strong className="text-slate-900">Description:</strong> {selectedIssue.description}</p>}
              <p><strong className="text-slate-900">Current Status:</strong> {selectedIssue.status}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                  Target Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['open', 'in_progress', 'resolved', 'closed'] as Status[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`p-3 rounded-xl border text-xs font-bold uppercase tracking-wider text-left transition-all ${
                        newStatus === st
                          ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-600/20'
                          : 'border-zinc-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {statuses[st]?.label.en}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Assignee / Department (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Roads & Transport Bureau Team B"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Admin Dispatch Note (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Dispatch details, estimated resolution time, or public update note..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedIssue(null)}
                  disabled={isUpdating}
                  className="border-zinc-200 text-slate-700 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isUpdating}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md px-5"
                >
                  Save & Dispatch Update
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

      {/* ESCALATION RESPONSE MODAL */}
      {respondingEscalation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-100 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-[#1a2744] flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-purple-600" /> Admin Response
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Responding to sector officer escalation</p>
              </div>
              <button
                onClick={() => { setRespondingEscalation(null); setAdminResponse(''); }}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Issue Summary */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Issue</p>
              <p className="text-base font-bold text-[#1a2744]">{respondingEscalation.title}</p>
              {respondingEscalation.address && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" /> {respondingEscalation.address}
                </p>
              )}
            </div>

            {/* Officer's Note */}
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
              <p className="text-[11px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Officer Escalation Note
              </p>
              <p className="text-sm font-medium text-rose-900">{respondingEscalation.escalation_notes || 'No note provided.'}</p>
            </div>

            {/* Response Form */}
            <form onSubmit={handleEscalationResponse} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                  <MessageSquare className="w-3.5 h-3.5" /> Your Admin Response
                </label>
                <textarea
                  rows={5}
                  placeholder="e.g. Priority escalated. Dispatching field supervisor to inspect site within 24h. Resources allocated."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none focus:outline-none focus:border-[#1a2744]"
                />
              </div>

              {updateMessage && (
                <div className={`p-3 rounded-xl text-sm font-bold ${
                  updateMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {updateMessage.text}
                </div>
              )}

              <div className="flex items-center gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setRespondingEscalation(null); setAdminResponse(''); }}
                  disabled={isResponding}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isResponding || !adminResponse.trim()}
                  className="bg-[#1a2744] hover:bg-slate-700 text-white font-bold flex items-center gap-2 shadow-md"
                >
                  <Send className="w-4 h-4" />
                  {isResponding ? 'Sending...' : 'Send Response'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-bold text-slate-500">
        Loading Admin Dashboard...
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
