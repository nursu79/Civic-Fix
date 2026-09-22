'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  X,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime, categories, statuses, Category, Status } from '@/lib/utils';
import { StatusBadge, Button } from '@/components/ui';

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
  upvote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  reporter_name?: string;
}

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Issue for Modal
  const [selectedIssue, setSelectedIssue] = useState<AdminIssue | null>(null);
  const [newStatus, setNewStatus] = useState<Status>('open');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [adminNote, setAdminNote] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchIssues = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch('/api/issues?limit=200&sort=recent');
      if (res.ok) {
        const data = await res.json();
        if (data.issues) {
          const formatted: AdminIssue[] = data.issues.map((item: any) => ({
            ...item,
            reporter_name: item.reporter?.display_name || 'Anonymous Citizen',
          }));
          setIssues(formatted);
        }
      } else {
        console.error('Admin issues API error status:', res.status);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

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
      if (!res.ok) throw new Error(data.error || 'Failed to update issue status');

      setUpdateMessage({ type: 'success', text: `Status updated to ${newStatus.replace('_', ' ')}` });
      
      setIssues(prev =>
        prev.map(i => (i.id === selectedIssue.id ? { ...i, status: newStatus } : i))
      );

      setTimeout(() => {
        setSelectedIssue(null);
        setUpdateMessage(null);
        setAdminNote('');
      }, 1000);
    } catch (err: any) {
      setUpdateMessage({ type: 'error', text: err.message || 'Update failed' });
    } finally {
      setIsUpdating(false);
    }
  };

  const filtered = issues.filter(issue => {
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1a2744] tracking-tight">Issue Repository</h1>
          <p className="text-slate-500 font-medium mt-1">Full database view of citizen report tickets</p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchIssues(true)}
          disabled={isRefreshing}
          className="self-start sm:self-auto border-zinc-200 text-slate-700 bg-white shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Table
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, title, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-zinc-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-zinc-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {Object.entries(categories).map(([k, c]) => (
              <option key={k} value={k}>{c.label.en}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pt-2">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase transition-all whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-[#1a2744] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-zinc-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Issue</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Priority</th>
                <th className="py-4 px-6">Reporter</th>
                <th className="py-4 px-6">Reported</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading issues...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">No issues found.</td>
                </tr>
              ) : (
                filtered.map(issue => (
                  <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-[#1a2744] line-clamp-1">{issue.title}</p>
                      {issue.address && <p className="text-xs text-slate-400 line-clamp-1">{issue.address}</p>}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase text-white"
                        style={{ backgroundColor: categories[issue.category]?.color || '#0D9488' }}
                      >
                        {categories[issue.category]?.label.en || issue.category}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={issue.status} />
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-800">
                      {Math.round(issue.priority_score)}
                    </td>
                    <td className="py-4 px-6 text-slate-600 text-xs font-bold">
                      {issue.reporter_name}
                    </td>
                    <td className="py-4 px-6 text-slate-400 text-xs">
                      {formatRelativeTime(issue.created_at)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedIssue(issue);
                          setNewStatus(issue.status);
                          setUpdateMessage(null);
                        }}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
                      >
                        Edit Status
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-6">
            <div className="flex items-start justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-[#1a2744]">{selectedIssue.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">ID: {selectedIssue.id}</p>
              </div>
              <button onClick={() => setSelectedIssue(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {updateMessage && (
              <div className={`p-3 rounded-xl text-xs font-bold ${updateMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {updateMessage.text}
              </div>
            )}

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-2">Change Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['open', 'in_progress', 'resolved', 'closed'] as Status[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`p-3 rounded-xl border text-xs font-bold uppercase ${newStatus === st ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-600/20' : 'border-zinc-200 text-slate-700'}`}
                    >
                      {statuses[st]?.label.en}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">Admin Dispatch Note</label>
                <textarea
                  rows={3}
                  placeholder="Notes for public audit log..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <Button type="button" variant="outline" onClick={() => setSelectedIssue(null)}>Cancel</Button>
                <Button type="submit" isLoading={isUpdating} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">Update</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
