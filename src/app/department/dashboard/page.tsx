'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { 
  Search, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  MapPin, 
  DollarSign, 
  Camera, 
  Sparkles,
  LogOut,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowUpDown,
  UserCheck,
  Building2,
  Handshake,
  BarChart3,
  User,
  Layers,
  TrendingUp,
  Check,
  Award,
  Menu,
  Phone,
  Image as ImageIcon,
  Edit3,
  Upload,
  Send,
  Navigation
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers';
import { getSectorTheme } from '@/lib/sectorThemes';
import { Department, Issue } from '@/lib/types';
import { formatRelativeTime, categories, Status } from '@/lib/utils';
import { NotificationCenter } from '@/components/features/NotificationCenter';
import { StatusBadge, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

const ITEMS_PER_PAGE = 6;

type TabType = 'dispatch' | 'analytics' | 'escalations' | 'profile';

function DepartmentDashboardContent() {
  const { user, profile, signOut } = useAuth();
  const searchParams = useSearchParams();
  const queryDept = searchParams?.get('dept') as Department | null;

  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mobile Sidebar Drawer Toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<TabType>('dispatch');

  // Role detection
  const isAdmin = (profile as any)?.role === 'admin';
  const userDept = (profile as any)?.department as Department | undefined;

  // Active department sector (Locked to user's assigned sector if not admin)
  const [activeDept, setActiveDept] = useState<Department>(
    queryDept || userDept || 'roads'
  );

  // Search, Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'priority'>('recent');
  const [currentPage, setCurrentPage] = useState(1);

  // Selected Issue for Resolution Modal
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [newStatus, setNewStatus] = useState<Status>('in_progress');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionImageUrl, setResolutionImageUrl] = useState('');
  const [resolutionImages, setResolutionImages] = useState<string[]>([]);
  const [billingCost, setBillingCost] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Escalation Modal State
  const [escalatingIssue, setEscalatingIssue] = useState<Issue | null>(null);
  const [escalationReason, setEscalationReason] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);
  const [expandedEscalations, setExpandedEscalations] = useState<Record<string, boolean>>({});

  // Sub-City Field Dispatch Modal State
  const [dispatchIssue, setDispatchIssue] = useState<Issue | null>(null);
  const [dispatchSubcity, setDispatchSubcity] = useState('Bole');
  const [dispatchUnit, setDispatchUnit] = useState('Field Maintenance Unit 1');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  // Officer Personal Profile State
  const [officerAvatarUrl, setOfficerAvatarUrl] = useState<string>(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  );
  const [displayName, setDisplayName] = useState<string>('');
  const [dutyStatus, setDutyStatus] = useState<'active' | 'on_call' | 'off_duty'>('active');
  const [officerPhone, setOfficerPhone] = useState<string>('+251 91 123 4567');
  const [officerBio, setOfficerBio] = useState<string>(
    'Senior Sector Operations Officer overseeing emergency field dispatch, citizen service fulfillment, and infrastructure maintenance.'
  );
  const [profileSaved, setProfileSaved] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const theme = getSectorTheme(activeDept);

  const handleDepartmentLogout = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabaseClient = createClient();
      await supabaseClient.auth.signOut();
    } catch (err) {
      console.warn('Department logout error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        document.cookie = 'sb-user-role=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {}
        window.location.href = '/en/login';
      }
    }
  };

  // Initialize profile fields from DB
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    } else if (user?.email) {
      setDisplayName(user.email.split('@')[0]);
    }
    // Load saved avatar from DB
    if ((profile as any)?.avatar_url) {
      setOfficerAvatarUrl((profile as any).avatar_url);
    }
  }, [profile, user]);

  // Read tab query parameter (e.g., ?tab=escalations)
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'dispatch' || tabParam === 'analytics' || tabParam === 'escalations' || tabParam === 'profile') {
      setActiveTab(tabParam as TabType);
    }
  }, [searchParams]);

  // Lock sector department for non-admin department officers
  useEffect(() => {
    if (!isAdmin) {
      if (userDept) {
        setActiveDept(userDept);
      }
    } else if (queryDept) {
      setActiveDept(queryDept);
    }
  }, [isAdmin, userDept, queryDept]);

  const fetchDepartmentIssues = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch('/api/issues?limit=150&sort=recent');
      if (res.ok) {
        const data = await res.json();
        if (data.issues) {
          const deptIssues = (data.issues as Issue[]).filter(
            (i) =>
              i.assigned_department === activeDept ||
              i.category === activeDept ||
              (!i.assigned_department && i.category === activeDept) ||
              activeDept === 'general'
          );
          setIssues(deptIssues);
        }
      }
    } catch (err) {
      console.error('Failed to load department issues:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeDept]);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    fetchDepartmentIssues();

    // Supabase real-time WebSocket subscription for zero-delay issue updates without HTTP log spam
    const channel = supabase
      .channel('department-dashboard-issues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
        fetchDepartmentIssues(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDepartmentIssues, supabase]);

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy, activeDept]);

  // Handle Resolution & Status Updates
  const handleResolveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    setIsSubmitting(true);
    setToastMessage(null);

    const imagesToSubmit = [...resolutionImages];
    if (resolutionImageUrl.trim() && !imagesToSubmit.includes(resolutionImageUrl.trim())) {
      imagesToSubmit.push(resolutionImageUrl.trim());
    }

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

      const res = await fetch(`/api/issues/${selectedIssue.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: newStatus,
          resolution_notes: resolutionNotes || null,
          resolution_images: imagesToSubmit,
          billing_cost: billingCost ? parseFloat(billingCost) : null,
          note: `Resolution dispatch by ${displayName || 'Department Staff'}`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update issue');
      }

      setToastMessage({
        type: 'success',
        text: `Issue updated to "${newStatus.toUpperCase()}"! Citizen notified via n8n automation.`,
      });

      await fetchDepartmentIssues(true);

      setTimeout(() => {
        setSelectedIssue(null);
        setResolutionNotes('');
        setResolutionImageUrl('');
        setResolutionImages([]);
        setBillingCost('');
        setToastMessage(null);
      }, 1800);
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Update failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Escalation to System Admin
  const handleEscalateToAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalatingIssue) return;

    setIsEscalating(true);
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

      const res = await fetch(`/api/issues/${escalatingIssue.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          escalated: true,
          escalation_notes: escalationReason || 'Escalated by Department Officer for System Admin review.',
          note: `Escalated to System Admin by ${displayName || 'Officer'}`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Escalation failed');
      }

      setToastMessage({
        type: 'success',
        text: `Issue successfully escalated to System Admin for priority intervention!`,
      });

      await fetchDepartmentIssues(true);

      setTimeout(() => {
        setEscalatingIssue(null);
        setEscalationReason('');
        setToastMessage(null);
      }, 2000);
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Escalation failed',
      });
    } finally {
      setIsEscalating(false);
    }
  };

  const handleDispatchSubmit = async () => {
    if (!dispatchIssue) return;
    setIsDispatching(true);

    try {
      const res = await fetch('/api/webhooks/n8n/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          issue_id: dispatchIssue.id,
          subcity: dispatchSubcity,
          assigned_unit: dispatchUnit,
          dispatch_notes: dispatchNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to dispatch issue');
      }

      setToastMessage({
        type: 'success',
        text: `🚀 Dispatched to ${dispatchUnit} (${dispatchSubcity}) via n8n automation!`,
      });

      setDispatchIssue(null);
      setDispatchNotes('');
      fetchDepartmentIssues(true);

      // Follow-up fetch after 2.5s to seamlessly catch n8n technician resolution callback
      setTimeout(() => {
        fetchDepartmentIssues(true);
      }, 2500);
    } catch (err: any) {
      console.error('Dispatch error:', err);
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to trigger field dispatch',
      });
    } finally {
      setIsDispatching(false);
    }
  };

  // Filtered & Sorted Issues List
  const filteredAndSorted = useMemo(() => {
    let result = issues.filter((i) => {
      if (statusFilter === 'open' && i.status !== 'open') return false;
      if (statusFilter === 'in_progress' && i.status !== 'in_progress') return false;
      if (statusFilter === 'resolved' && (i.status !== 'resolved' && i.status !== 'closed')) return false;
      if (statusFilter === 'escalated' && !(i as any).escalated) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.address?.toLowerCase().includes(q) ||
        i.reporter_name.toLowerCase().includes(q)
      );
    });

    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'priority') {
      result.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    }

    return result;
  }, [issues, statusFilter, searchQuery, sortBy]);

  // Escalated Issues List
  const escalatedIssues = useMemo(() => {
    return issues.filter((i: any) => i.escalated);
  }, [issues]);

  // Pagination Math
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE));
  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSorted.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSorted, currentPage]);

  // Sector Metrics & Financial Stats
  const openCount = issues.filter((i) => i.status === 'open').length;
  const inProgressCount = issues.filter((i) => i.status === 'in_progress').length;
  const resolvedCount = issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length;
  const escalatedCount = escalatedIssues.length;
  const totalBillingLogged = useMemo(() => {
    return issues.reduce((acc, i) => acc + (i.billing_cost || 0), 0);
  }, [issues]);
  const resolutionRate = issues.length > 0 ? Math.round((resolvedCount / issues.length) * 100) : 100;

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans">

      {/* SECTOR-THEMED SIDEBAR */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 ${theme.sidebarBg} text-white flex flex-col justify-between p-6 shadow-2xl transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Sector Branding Header */}
          <div className="space-y-2 pb-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${theme.badgeBg} ${theme.badgeText}`}>
                {activeDept.toUpperCase()} DESK
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-white/60 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white leading-snug">
              {theme.title}
            </h1>
            <p className="text-xs font-medium text-white/70 line-clamp-2">
              {theme.subtitle}
            </p>
          </div>

          {/* Officer Profile Card in Sidebar */}
          <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 flex items-center gap-3">
            {officerAvatarUrl ? (
              <img
                src={officerAvatarUrl}
                alt="Officer Avatar"
                className="w-11 h-11 rounded-xl object-cover ring-2 ring-white/30 shadow-md"
                onError={() => setOfficerAvatarUrl('')}
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-white/20 text-white font-black flex items-center justify-center text-base shadow-sm ring-2 ring-white/20">
                {(displayName || 'O')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white truncate">
                {displayName || 'Officer Staff'}
              </p>
              <p className="text-[11px] font-bold text-white/70 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-white/80" />
                {isAdmin ? 'System Admin' : `${activeDept.toUpperCase()} Officer`}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-2">
            {[
              { id: 'dispatch', label: 'Dispatch Queue', icon: Layers, count: issues.length },
              { id: 'analytics', label: 'Sector Analytics', icon: BarChart3 },
              { id: 'escalations', label: 'Admin Escalations', icon: ShieldAlert, count: escalatedCount },
              { id: 'profile', label: 'Officer Profile', icon: User },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as TabType);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black tracking-wider transition-all ${
                    isActive ? theme.sidebarActive : theme.sidebarHover
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </div>
                  {tab.count !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white text-slate-900' : 'bg-white/20 text-white'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Admin Sector Switcher (Only visible to System Admins inside sidebar) */}
          {isAdmin && (
            <div className="pt-4 border-t border-white/10 space-y-2">
              <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" /> System Admin Sectors:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['roads', 'water', 'lighting', 'parks', 'sanitation', 'safety', 'general'] as Department[]).map((dept) => {
                  const isActive = activeDept === dept;
                  return (
                    <button
                      key={dept}
                      onClick={() => setActiveDept(dept)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase text-left transition-all ${
                        isActive
                          ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      {dept}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer Actions */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs text-white/70 font-bold px-1">
            <span className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${
                dutyStatus === 'active' ? 'bg-emerald-400' : dutyStatus === 'on_call' ? 'bg-amber-400' : 'bg-rose-400'
              }`} />
              {dutyStatus.replace('_', ' ').toUpperCase()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDepartmentIssues(true)}
              disabled={isRefreshing}
              className="border-white/20 text-white hover:bg-white/10 text-[11px] py-1 px-2.5 bg-transparent"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <button
            type="button"
            onClick={handleDepartmentLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-600 text-rose-100 hover:text-white transition-all border border-rose-400/30 cursor-pointer shadow-xs group"
          >
            <LogOut className="w-4 h-4 text-rose-200 group-hover:text-white transition-colors" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE AREA */}
      <main className={`flex-1 min-w-0 bg-gradient-to-br ${theme.sidebarGradient} p-4 sm:p-8 overflow-y-auto`}>
        <div className="max-w-5xl mx-auto space-y-6">

        {/* Top Workspace Header with Notifications */}
        <div className="relative z-40 flex items-center justify-between bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${theme.badgeBg} ${theme.badgeText}`}>
              {activeDept} Sector Desk
            </span>
          </div>
          <div className="flex items-center gap-3">
          </div>
        </div>

          {/* Global Toast Notification */}
          {toastMessage && (
          <div
            className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              {toastMessage.text}
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: DISPATCH QUEUE WORKSPACE */}
        {activeTab === 'dispatch' && (
          <div className="space-y-6">
            {/* Sector KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-white/60 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                    Action Required
                  </span>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-3xl font-black text-[#1a2744]">{isLoading ? '—' : openCount}</p>
                <p className="text-xs font-bold text-slate-500">Unassigned / Pending Reports</p>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-white/60 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    In Dispatch
                  </span>
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-3xl font-black text-[#1a2744]">{isLoading ? '—' : inProgressCount}</p>
                <p className="text-xs font-bold text-slate-500">Technicians Assigned / Active Fixes</p>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-white/60 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Resolved
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-3xl font-black text-[#1a2744]">{isLoading ? '—' : resolvedCount}</p>
                <p className="text-xs font-bold text-slate-500">Completed & Notified via n8n</p>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-white/60 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                    Escalated
                  </span>
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-3xl font-black text-[#1a2744]">{isLoading ? '—' : escalatedCount}</p>
                <p className="text-xs font-bold text-slate-500">Flagged for System Admin</p>
              </div>
            </div>

            {/* Main Issue Queue Card */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-white/60 shadow-xl shadow-slate-900/5 space-y-6">

              {/* Search, Filter Tabs & Sort Controls */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search ${activeDept} queue by title, location, reporter...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                  {[
                    { id: 'all', label: 'All Queue' },
                    { id: 'open', label: 'Open' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'resolved', label: 'Resolved' },
                    { id: 'escalated', label: 'Escalated' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStatusFilter(s.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-black tracking-wider uppercase transition-all whitespace-nowrap ${
                        statusFilter === s.id
                          ? 'bg-[#1a2744] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500"
                  >
                    <option value="recent">Newest Reports</option>
                    <option value="priority">Highest Priority Score</option>
                    <option value="oldest">Oldest Reports</option>
                  </select>
                </div>
              </div>

              {/* Issues List Header */}
              <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-black text-[#1a2744]">
                  Sector Dispatch Queue ({filteredAndSorted.length} Total)
                </h2>
                <span className="text-xs font-bold text-slate-500">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              {/* Issues Feed List */}
              <div className="space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="bg-slate-50 rounded-2xl p-6 border border-slate-200 animate-pulse h-32" />
                    ))}
                  </div>
                ) : paginatedIssues.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-12 border border-slate-200 text-center space-y-2">
                    <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                    <h3 className="text-base font-bold text-[#1a2744]">No reports in this sector queue</h3>
                    <p className="text-xs text-slate-500">Try adjusting your status filter or search parameters.</p>
                  </div>
                ) : (
                  paginatedIssues.map((issue) => {
                    const isEscalated = (issue as any).escalated;
                    return (
                      <div
                        key={issue.id}
                        className={`bg-white rounded-2xl p-6 border transition-all space-y-4 group ${
                          isEscalated
                            ? 'border-purple-200 bg-purple-50/20 shadow-md'
                            : 'border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-400'
                        }`}
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
                              {isEscalated && (
                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3 text-purple-600" /> Escalated to Admin
                                </span>
                              )}
                              <span className="text-xs font-bold text-slate-400">
                                Priority: <span className="text-slate-800 font-black">{Math.round(issue.priority_score)}</span>
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-[#1a2744] group-hover:text-teal-600 transition-colors">
                              {issue.title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {!isEscalated && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEscalatingIssue(issue);
                                  setEscalationReason('');
                                }}
                                className="border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 font-bold text-xs"
                              >
                                <Handshake className="w-3.5 h-3.5 mr-1 text-purple-600" /> Escalate to Admin
                              </Button>
                            )}

                              <Button
                                size="sm"
                                onClick={() => {
                                  setDispatchIssue(issue);
                                  setDispatchSubcity((issue as any).subcity || 'Bole');
                                  setDispatchUnit((issue as any).assigned_unit || `${activeDept} Sub-City Unit 1`);
                                  setDispatchNotes('');
                                }}
                                className="bg-[#1a2744] hover:bg-slate-800 text-white font-bold shadow-sm text-xs"
                              >
                                <Navigation className="w-3.5 h-3.5 mr-1 text-teal-400" /> Dispatch Crew
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedIssue(issue);
                                  setNewStatus(issue.status === 'open' ? 'in_progress' : issue.status);
                                  setResolutionNotes(issue.resolution_notes || '');
                                  setResolutionImages(issue.resolution_images || []);
                                  setBillingCost(issue.billing_cost ? String(issue.billing_cost) : '');
                                }}
                                className={`${theme.primaryButton} font-bold shadow-sm text-xs`}
                              >
                                Update & Resolve <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                          </div>
                        </div>

                        {issue.description && (
                          <p className="text-sm text-slate-600 line-clamp-2">{issue.description}</p>
                        )}

                        {/* Issue Images Preview */}
                        {issue.images && issue.images.length > 0 && (
                          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1">
                            {issue.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Issue photo ${idx + 1}`}
                                className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm hover:scale-105 transition-transform cursor-pointer shrink-0"
                                onClick={() => window.open(img, '_blank')}
                              />
                            ))}
                          </div>
                        )}

                        {/* Collapsible Escalation Thread Drawer */}
                        {isEscalated && (
                          <div className="border border-purple-200/80 bg-purple-50/40 rounded-2xl overflow-hidden transition-all">
                            <button
                              type="button"
                              onClick={() => setExpandedEscalations(prev => ({ ...prev, [issue.id]: !prev[issue.id] }))}
                              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-purple-900 hover:bg-purple-100/50 transition-colors"
                            >
                              <span className="flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0" />
                                Escalation Thread
                                {(issue as any).escalation_admin_response ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    ✓ Admin Responded
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300">
                                    Pending Admin Response
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
                                {(issue as any).escalation_notes && (
                                  <div className="p-3 bg-purple-50/90 border border-purple-200 rounded-xl text-xs space-y-1">
                                    <p className="font-bold text-purple-900 flex items-center gap-1.5">
                                      <ShieldAlert className="w-3.5 h-3.5 text-purple-600" /> Officer Escalation Note:
                                    </p>
                                    <p className="text-purple-800 font-medium">{(issue as any).escalation_notes}</p>
                                  </div>
                                )}

                                {(issue as any).escalation_admin_response && (
                                  <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs space-y-1">
                                    <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> System Admin Response:
                                    </p>
                                    <p className="text-emerald-800 font-bold">{(issue as any).escalation_admin_response}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {issue.resolution_notes && (
                          <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs space-y-1">
                            <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Resolution Proof & Notes:
                            </p>
                            <p className="text-emerald-800 font-medium">{issue.resolution_notes}</p>
                            {issue.billing_cost && (
                              <p className="text-emerald-700 font-bold pt-1">
                                Repair Cost Logged: ${issue.billing_cost.toFixed(2)}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-3 border-t border-slate-100 flex-wrap gap-3">
                          <div className="flex items-center gap-4">
                            {issue.address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {issue.address}
                              </span>
                            )}
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              Reporter: {issue.reporter_name}
                            </span>
                          </div>

                          <span className="text-slate-400 font-bold">
                            Reported {formatRelativeTime(issue.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination Navigation Bar */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-500">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length)} of {filteredAndSorted.length} tickets
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="text-xs font-bold border-slate-200"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx + 1}
                          onClick={() => setCurrentPage(idx + 1)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                            currentPage === idx + 1
                              ? 'bg-[#1a2744] text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="text-xs font-bold border-slate-200"
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SECTOR ANALYTICS & FINANCIAL PERFORMANCE */}
        {activeTab === 'analytics' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-white/60 shadow-xl shadow-slate-900/5 space-y-8">
            <div>
              <h2 className="text-2xl font-black text-[#1a2744]">
                {activeDept.toUpperCase()} Sector Analytics & Performance
              </h2>
              <p className="text-sm text-slate-600">
                Departmental resolution metrics, repair budget utilization, and n8n notification throughput.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Resolution Success Rate</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-black text-emerald-600">{resolutionRate}%</p>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> High Performance
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">{resolvedCount} resolved out of {issues.length} total tickets</p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Repair Budget Logged</p>
                <p className="text-4xl font-black text-[#1a2744]">${totalBillingLogged.toFixed(2)}</p>
                <p className="text-xs text-slate-500 font-medium">Logged across all resolved dispatch jobs</p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">n8n Automation Engine</p>
                <div className="flex items-center gap-2 text-teal-600 font-black text-2xl">
                  <Sparkles className="w-6 h-6 animate-pulse" /> 100% Operational
                </div>
                <p className="text-xs text-slate-500 font-medium">Webhook payloads dispatched asynchronously</p>
              </div>
            </div>

            <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-base font-bold text-[#1a2744]">Dispatch Resolution Funnel</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Action Required (Open)</span>
                    <span>{openCount} ({issues.length ? Math.round((openCount / issues.length) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${issues.length ? (openCount / issues.length) * 100 : 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>In Dispatch (Active Fixes)</span>
                    <span>{inProgressCount} ({issues.length ? Math.round((inProgressCount / issues.length) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${issues.length ? (inProgressCount / issues.length) * 100 : 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Resolved & Verified</span>
                    <span>{resolvedCount} ({resolutionRate}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${resolutionRate}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN ESCALATION CENTER */}
        {activeTab === 'escalations' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-white/60 shadow-xl shadow-slate-900/5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#1a2744] flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-purple-600" /> Admin Escalation Center
                </h2>
                <p className="text-sm text-slate-600">
                  Tickets flagged for priority intervention, extra budget requests, or inter-department assistance.
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-200">
                {escalatedIssues.length} Escalated Issues
              </span>
            </div>

            {escalatedIssues.length === 0 ? (
              <div className="p-12 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold text-[#1a2744]">No Escalated Issues</h3>
                <p className="text-xs text-slate-500">All tickets in this sector queue are being handled normally by department officers.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {escalatedIssues.map((issue: any) => (
                  <div key={issue.id} className="p-6 bg-purple-50/40 border border-purple-200 rounded-2xl space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={issue.status} />
                          <span className="text-xs font-bold text-purple-700">
                            Escalated {formatRelativeTime(issue.updated_at)}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-[#1a2744]">{issue.title}</h3>
                      </div>

                      {/* Admin Response (if received) */}
                      {(issue as any).escalation_admin_response && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                          <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Admin Response Received
                          </p>
                          <p className="text-sm font-medium text-emerald-900">{(issue as any).escalation_admin_response}</p>
                          {(issue as any).escalation_responded_at && (
                            <p className="text-[10px] text-emerald-600 font-bold mt-1">
                              Responded {formatRelativeTime((issue as any).escalation_responded_at)}
                            </p>
                          )}
                        </div>
                      )}
                      {!(issue as any).escalation_admin_response && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Awaiting System Admin response...
                          </p>
                        </div>
                      )}

                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedIssue(issue);
                          setNewStatus(issue.status);
                          setResolutionNotes(issue.resolution_notes || '');
                        }}
                        className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
                      >
                        Manage Escalated Ticket
                      </Button>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-purple-100 space-y-1 text-xs">
                      <p className="font-bold text-purple-900 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-purple-600" /> Escalation Reason:
                      </p>
                      <p className="text-purple-950 font-medium">{issue.escalation_notes || 'Requested System Admin review'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: OFFICER PROFILE & CUSTOMIZATION */}
        {activeTab === 'profile' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-white/60 shadow-xl shadow-slate-900/5 space-y-8">
            <div>
              <h2 className="text-2xl font-black text-[#1a2744] flex items-center gap-2">
                <Edit3 className="w-6 h-6 text-teal-600" /> Officer Profile & Identity Customization
              </h2>
              <p className="text-sm text-slate-600">
                Update your officer avatar photo, display name, mission bio, and duty contact preferences.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Profile Card & Avatar Customization */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                <div className="flex items-center gap-5">
                  {officerAvatarUrl ? (
                    <img
                      src={officerAvatarUrl}
                      alt="Officer Avatar"
                      className="w-20 h-20 rounded-2xl object-cover ring-4 ring-teal-500/20 shadow-md"
                      onError={() => setOfficerAvatarUrl('')}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-[#1a2744] text-white font-black text-3xl flex items-center justify-center shadow-md ring-4 ring-teal-500/20">
                      {(displayName || 'O')[0].toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-[#1a2744]">
                      {displayName || 'Department Officer'}
                    </h3>
                    <p className="text-xs font-bold text-teal-700 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> Assigned Sector: {activeDept.toUpperCase()} Authority
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
                      Staff ID: {profile?.id || user?.id || 'officer-id-001'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-200">
                  {/* Profile Picture File Upload */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-slate-500" /> Profile Picture
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 bg-white border border-dashed border-slate-300 hover:border-teal-500 hover:bg-teal-50/30 rounded-xl cursor-pointer transition-all group">
                      <Upload className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                      <span className="text-sm font-medium text-slate-500 group-hover:text-teal-700">
                        {officerAvatarUrl ? 'Change photo — click to upload new' : 'Upload photo from your device'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (typeof ev.target?.result === 'string') {
                              setOfficerAvatarUrl(ev.target.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>

                  {/* Display Name Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Officer Display Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Inspector Saleh Nur"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {/* Bio / Mission Statement Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Officer Bio & Personal Mission Statement
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Write a brief officer bio..."
                      value={officerBio}
                      onChange={(e) => setOfficerBio(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {/* Duty Status */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Department Duty Status
                    </label>
                    <select
                      value={dutyStatus}
                      onChange={(e) => setDutyStatus(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                    >
                      <option value="active">🟢 Active on Dispatch Duty</option>
                      <option value="on_call">🟡 On Call (Emergency Backlog)</option>
                      <option value="off_duty">🔴 Off Duty</option>
                    </select>
                  </div>

                  {/* Direct Phone */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" /> Direct Hotline / Phone Number
                    </label>
                    <input
                      type="text"
                      value={officerPhone}
                      onChange={(e) => setOfficerPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <Button
                    onClick={async () => {
                      if (!user?.id) return;
                      try {
                        const res = await fetch('/api/admin/users', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            userId: user.id,
                            avatar_url: officerAvatarUrl || null,
                            display_name: displayName || null,
                          }),
                        });
                        if (res.ok) {
                          setProfileSaved(true);
                          setTimeout(() => setProfileSaved(false), 2500);
                        } else {
                          const d = await res.json().catch(() => ({}));
                          setToastMessage({ type: 'error', text: d.error || 'Failed to save profile' });
                        }
                      } catch {
                        setToastMessage({ type: 'error', text: 'Network error saving profile' });
                      }
                    }}
                    className={`${theme.primaryButton} font-bold text-xs w-full shadow-sm`}
                  >
                    {profileSaved ? '✓ Profile & Photo Saved Successfully' : 'Save Profile & Photo Preferences'}
                  </Button>
                </div>
              </div>

              {/* Security Verification & Access Privileges */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                <h3 className="text-base font-black text-[#1a2744] flex items-center gap-2">
                  <Award className="w-5 h-5 text-teal-600" /> Authorized Role Privileges
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">Sector Desk Access</span>
                    <span className="font-black text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Granted ({activeDept.toUpperCase()})
                    </span>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">n8n Automation Dispatch</span>
                    <span className="font-black text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Active
                    </span>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">System Admin Escalation</span>
                    <span className="font-black text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Enabled
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 font-medium space-y-1">
                  <p className="font-bold">Enterprise Security Policy</p>
                  <p>All status updates, photo proof submissions, and billing entries logged by department officers are audited and signed with your cryptographic user session token.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>{/* /max-w-5xl */}
      </main>

      {/* Resolution & Status Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-100 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${theme.badgeBg} ${theme.badgeText}`}>
                  {activeDept} Sector Dispatch
                </span>
                <h3 className="text-xl font-black text-[#1a2744] mt-1">
                  Manage & Resolve Ticket
                </h3>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Title</p>
              <p className="text-base font-bold text-[#1a2744]">{selectedIssue.title}</p>
              {selectedIssue.address && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {selectedIssue.address}
                </p>
              )}
            </div>

            <form onSubmit={handleResolveIssue} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Update Work Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as Status)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                >
                  <option value="open">Open (Unassigned)</option>
                  <option value="in_progress">In Progress (Dispatch Active)</option>
                  <option value="resolved">Resolved (Fix Complete)</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Resolution Notes / Work Performed
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe work completed by department technicians..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-slate-500" /> Attach Proof Photo
                </label>
                <label className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-dashed border-slate-300 hover:border-teal-500 hover:bg-teal-50/30 rounded-xl cursor-pointer transition-all group">
                  <Upload className="w-4 h-4 text-slate-400 group-hover:text-teal-600 shrink-0" />
                  <span className="text-sm font-medium text-slate-500 group-hover:text-teal-700 truncate">
                    {resolutionImageUrl ? '✓ Photo attached — click to change' : 'Upload proof photo from your device'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (typeof ev.target?.result === 'string') {
                          setResolutionImageUrl(ev.target.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {resolutionImageUrl && (
                  <div className="flex items-center gap-3 mt-2">
                    <img
                      src={resolutionImageUrl}
                      alt="Proof preview"
                      className="w-16 h-16 rounded-lg object-cover border border-slate-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setResolutionImageUrl('')}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Remove photo
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-slate-500" /> Repair Cost / Billing Amount (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 150.00"
                  value={billingCost}
                  onChange={(e) => setBillingCost(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-teal-600 shrink-0" />
                <p className="text-xs text-teal-900 font-medium">
                  Submitting will automatically trigger <span className="font-bold">n8n Automation</span> to notify the reporting citizen via Email/SMS with proof photos and cost summary.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedIssue(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${theme.primaryButton} font-bold shadow-md`}
                >
                  {isSubmitting ? 'Dispatching & Notifying...' : 'Save & Dispatch n8n Webhook'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalate to System Admin Modal */}
      {escalatingIssue && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-purple-100 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-black text-[#1a2744]">
                  Escalate to System Admin
                </h3>
              </div>
              <button
                onClick={() => setEscalatingIssue(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl space-y-1">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Ticket Title</p>
              <p className="text-base font-bold text-purple-950">{escalatingIssue.title}</p>
            </div>

            <form onSubmit={handleEscalateToAdmin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Reason for Escalation / Assistance Needed
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain why this ticket requires System Admin intervention..."
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
                🛡️ Flagging this issue will notify the System Admin and mark the ticket for priority administrative intervention.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEscalatingIssue(null)}
                  disabled={isEscalating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isEscalating}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-md"
                >
                  {isEscalating ? 'Escalating...' : 'Submit Escalation to Admin'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-City Field Crew Dispatch Modal (n8n Webhook Trigger) */}
      {dispatchIssue && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-teal-100 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Navigation className="w-6 h-6 text-teal-600" />
                <h3 className="text-xl font-black text-[#1a2744]">
                  Dispatch Field Maintenance Crew
                </h3>
              </div>
              <button
                onClick={() => setDispatchIssue(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl space-y-1">
              <p className="text-xs font-bold text-teal-700 uppercase tracking-wider">Issue Ticket</p>
              <p className="text-base font-bold text-teal-950">{dispatchIssue.title}</p>
              {dispatchIssue.address && (
                <p className="text-xs text-teal-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" /> {dispatchIssue.address}
                </p>
              )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleDispatchSubmit(); }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Addis Ababa Sub-City
                  </label>
                  <select
                    value={dispatchSubcity}
                    onChange={(e) => setDispatchSubcity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    <option value="Bole">Bole Sub-City</option>
                    <option value="Arada">Arada Sub-City</option>
                    <option value="Yeka">Yeka Sub-City</option>
                    <option value="Kirkos">Kirkos Sub-City</option>
                    <option value="Nifas Silk">Nifas Silk Sub-City</option>
                    <option value="Addis Ketema">Addis Ketema Sub-City</option>
                    <option value="Lideta">Lideta Sub-City</option>
                    <option value="Gullele">Gullele Sub-City</option>
                    <option value="Akaky Kaliti">Akaky Kaliti Sub-City</option>
                    <option value="Kolfe Keraniyo">Kolfe Keraniyo Sub-City</option>
                    <option value="Lemi Kura">Lemi Kura Sub-City</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Assigned Field Unit
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bole Unit 3 (Emergency Pipe Team)"
                    value={dispatchUnit}
                    onChange={(e) => setDispatchUnit(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Dispatch Instructions / Technical Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide GPS landmarks or specific tools required..."
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl text-xs text-teal-900 font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Triggers <strong>n8n automation webhook</strong> to notify field crew via Telegram/SMS with Google Maps directions.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDispatchIssue(null)}
                  disabled={isDispatching}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isDispatching}
                  className="bg-[#1a2744] hover:bg-slate-800 text-white font-bold shadow-md"
                >
                  {isDispatching ? 'Dispatching via n8n...' : '🚀 Trigger n8n Field Dispatch'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DepartmentDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-bold text-slate-500">
        Loading Sector Dashboard...
      </div>
    }>
      <DepartmentDashboardContent />
    </Suspense>
  );
}
