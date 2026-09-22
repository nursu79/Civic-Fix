'use client';

import { useState, useEffect } from 'react';
import { Search, Shield, Building2, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Department } from '@/lib/types';

interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  role: 'citizen' | 'department_officer' | 'admin';
  department?: Department | null;
  created_at: string;
}

const DEPT_LABELS: Record<string, string> = {
  roads: 'Roads & Public Works',
  water: 'Water & Sewerage',
  lighting: 'Electrical Grid & Power',
  parks: 'Parks & Environment',
  sanitation: 'Sanitation & Waste',
  safety: 'Public Safety & Hazards',
};

const ROLE_LABELS: Record<string, string> = {
  citizen: 'Citizen',
  department_officer: 'Department Officer',
  admin: 'System Admin',
};

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        if (data.profiles) {
          setProfiles(data.profiles as UserProfile[]);
        }
      }
    } catch (err) {
      console.error('Failed to load user directory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateUser = async (
    userId: string,
    newRole: string,
    newDept: string | undefined,
    fieldUpdated: 'role' | 'department',
    userName: string
  ) => {
    setUpdatingId(userId);
    setSuccessToast(null);

    // Optimistically update local state so dropdowns reflect immediately
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === userId
          ? {
              ...p,
              role: newRole as any,
              department: (newDept as Department) || null,
            }
          : p
      )
    );

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role: newRole,
          department: newDept || null,
        }),
      });

      if (res.ok) {
        if (fieldUpdated === 'department') {
          const deptText = DEPT_LABELS[newDept || ''] || 'No Department';
          setSuccessToast(`Successfully assigned ${userName} to the ${deptText} department!`);
        } else {
          const roleText = ROLE_LABELS[newRole] || newRole;
          setSuccessToast(`Successfully updated ${userName}'s platform role to "${roleText.toUpperCase()}"!`);
        }
        setTimeout(() => setSuccessToast(null), 3500);
      } else {
        const errorData = await res.json();
        console.error('API update notice:', errorData);
      }
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = profiles.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.display_name?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-black text-[#1a2744] tracking-tight">Citizen & Staff Directory</h1>
        <p className="text-slate-500 font-medium mt-1">Manage platform accounts, elevate department officers, and assign sector domains</p>
      </div>

      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {successToast}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search accounts by name, username, role, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm font-medium focus:outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-zinc-200 text-xs font-black text-slate-500 uppercase">
              <th className="py-4 px-6">User Account</th>
              <th className="py-4 px-6">Platform Role</th>
              <th className="py-4 px-6">Assigned Sector Dept</th>
              <th className="py-4 px-6">Actions</th>
              <th className="py-4 px-6">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-medium">
            {isLoading ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400">Loading directory...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400">No user accounts found.</td></tr>
            ) : (
              filtered.map(p => {
                const name = p.display_name || p.username || 'User';
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-4 px-6 font-bold text-[#1a2744]">
                      <div>
                        <p>{name}</p>
                        <p className="text-xs text-slate-400 font-normal">{p.username || p.id.slice(0, 8)}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={p.role}
                        disabled={updatingId === p.id}
                        onChange={(e) => handleUpdateUser(p.id, e.target.value, p.department || undefined, 'role', name)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase border transition-all ${
                          p.role === 'admin' 
                            ? 'bg-amber-50 text-amber-900 border-amber-200' 
                            : p.role === 'department_officer'
                            ? 'bg-purple-50 text-purple-900 border-purple-200'
                            : 'bg-teal-50 text-teal-800 border-teal-200'
                        }`}
                      >
                        <option value="citizen">Citizen</option>
                        <option value="department_officer">Department Officer</option>
                        <option value="admin">System Admin</option>
                      </select>
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={p.department || ''}
                        disabled={updatingId === p.id}
                        onChange={(e) => handleUpdateUser(p.id, p.role, e.target.value, 'department', name)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                      >
                        <option value="">No Department</option>
                        <option value="roads">Roads & Public Works</option>
                        <option value="water">Water & Sewerage</option>
                        <option value="lighting">Electrical Grid & Power</option>
                        <option value="parks">Parks & Environment</option>
                        <option value="sanitation">Sanitation & Waste</option>
                        <option value="safety">Public Safety & Hazards</option>
                      </select>
                    </td>
                    <td className="py-4 px-6">
                      {p.role === 'department_officer' && (
                        <a
                          href={`/department/dashboard?dept=${p.department || 'roads'}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200/80 hover:bg-teal-100 transition-all shadow-sm"
                        >
                          <Building2 className="w-3.5 h-3.5" /> View Sector Desk
                        </a>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-400 text-xs">
                      {formatDate(p.created_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
