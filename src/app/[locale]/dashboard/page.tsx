"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers";
import { Button, Input, Badge, Card } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, 
  Clock, 
  ThumbsUp, 
  AlertCircle, 
  CheckCircle2, 
  Shield, 
  User as UserIcon,
  Phone,
  Edit2,
  Lock,
  Loader2,
  Plus,
  Map as MapIcon
} from "lucide-react";
import { ReputationBadge } from "@/components/features/ReputationBadge";
import dynamic from 'next/dynamic';

import { CommunityMapProps } from '@/components/features/CommunityMap';

const CommunityMap = dynamic<CommunityMapProps>(() => import('@/components/features/CommunityMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse rounded-3xl" />
});
import { cn, statuses, Status, formatDate } from "@/lib/utils";
import Link from 'next/link';
import { Issue } from '@/lib/types';

export default function DashboardPage() {
  const { user, profile, isLoading, updateProfile } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('dashboard');
  const common = useTranslations('common');
  const auth = useTranslations('auth');
  
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isIssuesLoading, setIsIssuesLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    role: 'citizen'
  });
  const [nearbyIssues, setNearbyIssues] = useState<Issue[]>([]);
  const [isNearbyLoading, setIsNearbyLoading] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/${locale}/login`);
    }
  }, [isLoading, user, router, locale]);

  // Load User Data into Form
  useEffect(() => {
    if (profile) {
      setFormData({
        phone: profile.phone || '',
        role: profile.role || 'citizen'
      });
    }
  }, [profile]);

  // Fetch Issues
  useEffect(() => {
    const fetchIssues = async () => {
      if (!user) return;
      
      try {
        const res = await fetch(`/api/issues?reporter_id=${user.id}&sort=recent`);
        const data = await res.json();
        setIssues(data.issues || []);
      } catch (error) {
        console.error("Failed to fetch issues", error);
      } finally {
        setIsIssuesLoading(false);
      }
    };
    
    if (user) {
      fetchIssues();
    }
  }, [user]);

  // Fetch Nearby Issues
  useEffect(() => {
    const fetchNearby = async () => {
      if (!profile?.residence) return;
      setIsNearbyLoading(true);
      try {
        const res = await fetch(`/api/issues?location=${encodeURIComponent(profile.residence)}&limit=5`);
        const data = await res.json();
        setNearbyIssues(data.issues || []);
      } catch (error) {
        console.error("Failed to fetch nearby issues", error);
      } finally {
        setIsNearbyLoading(false);
      }
    };

    if (profile?.residence) {
      fetchNearby();
    }
  }, [profile?.residence]);

  // Calculate Stats
  const stats = {
    totalReports: issues.length,
    totalUpvotes: issues.reduce((acc, issue) => acc + (issue.upvote_count || 0), 0),
    resolvedIssues: issues.filter(i => i.status === 'resolved').length
  };

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        phone: formData.phone,
        // Role update removed for security/UX - handled by Admin only
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile", error);
    }
  };

  // Handle Phone Verification (Mock)
  const handleVerifyPhone = () => {
    console.log("OTP Triggered");
    setIsVerifying(true);
    // Mimic API delay
    setTimeout(() => {
      setIsVerifying(false); // Close after "verification"
      alert("Phone Verified (Mock)");
    }, 2000);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="w-8 h-8 text-teal-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* 1. Profile Sidebar (Identity Zone) */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-24"
            >
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-lg shadow-teal-900/5 relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 p-1 mb-4 shadow-lg">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                      {profile?.avatar_url ? (
                         <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-teal-primary uppercase">
                          {(profile?.display_name?.[0] || user.email?.[0] || '?')}
                        </span>
                      )}
                    </div>
                  </div>

                  <h2 className="text-xl font-bold text-deep-navy mb-1">
                    {profile?.display_name || t('profile.citizen')}
                  </h2>
                  <p className="text-sm text-slate-500 mb-4 break-all px-2">{user.email}</p>

                  <Badge variant={profile?.role === 'admin' ? "info" : "default"} className="mb-4 px-4 py-1 text-xs uppercase tracking-widest">
                    {profile?.role === 'admin' ? 'Admin' : t('profile.citizen')}
                  </Badge>

                  <ReputationBadge points={profile?.reputation_points || 0} className="mb-6" />

                  {/* Impact Stats (Mini - Sidebar) */}
                   <div className="w-full grid grid-cols-3 gap-2 mb-6 border-b border-gray-100 pb-6">
                      <div className="text-center">
                        <div className="text-lg font-black text-deep-navy">{stats.totalReports}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">{t('stats.reports')}</div>
                      </div>
                      <div className="text-center border-l border-r border-gray-100">
                        <div className="text-lg font-black text-teal-600">{stats.totalUpvotes}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">{t('stats.impact')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-black text-green-600">{stats.resolvedIssues}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">{t('stats.solved')}</div>
                      </div>
                   </div>

                  {!isEditing ? (
                    <div className="w-full space-y-3">
                       <div className="flex items-center justify-between text-sm py-2 border-b border-gray-100">
                         <div className="flex items-center text-slate-500">
                           <Phone className="w-4 h-4 mr-3" />
                           <span>{profile?.phone || t('profile.noPhone')}</span>
                         </div>
                         <button onClick={() => setIsEditing(true)} className="text-xs text-teal-primary font-bold hover:underline">{t('profile.edit')}</button>
                       </div>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateProfile} className="w-full space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-left">{t('profile.phone')}</label>
                        <Input 
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          placeholder="+251..."
                          className="h-10 text-sm bg-white/50"
                        />
                      </div>
                      
                      {/* Role is Read-Only for Citizens */}
                      <div className="space-y-2 opacity-50 pointer-events-none">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-left">Role</label>
                        <div className="w-full h-10 rounded-md border border-input bg-gray-50 px-3 py-2 text-sm text-slate-500 flex items-center">
                          {formData.role}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button type="button" variant="ghost" className="flex-1 h-9 text-xs" onClick={() => setIsEditing(false)}>{t('profile.cancel')}</Button>
                        <Button type="submit" className="flex-1 h-9 text-xs bg-teal-primary hover:bg-teal-600">{t('profile.save')}</Button>
                      </div>
                    </form>
                  )}
                  
                  {/* Phone Verification */}
                   <div className="mt-8 pt-6 border-t border-dashed border-gray-200 w-full">
                     <Button 
                      variant="ghost" 
                      className={cn(
                        "w-full justify-between group", 
                        isVerifying ? "text-teal-primary bg-teal-50" : "text-slate-400 hover:text-deep-navy"
                      )}
                      onClick={handleVerifyPhone}
                      disabled={isVerifying}
                    >
                       <span className="text-xs font-bold uppercase tracking-widest flex items-center">
                         <Shield className="w-3 h-3 mr-2" />
                         {t('profile.verifyId')}
                       </span>
                       {isVerifying ? (
                         <Loader2 className="w-3 h-3 animate-spin" />
                       ) : (
                         <div className="w-2 h-2 rounded-full bg-red-400 group-hover:bg-green-400 transition-colors" />
                       )}
                     </Button>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 2. Masonry Grid (Impact Zone) */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black text-deep-navy tracking-tight mb-2">{t('title')}</h1>
                <p className="text-slate-500 font-medium">{t('subtitle')}</p>
              </div>
              <Link href={`/${locale}/report`}>
                <Button className="bg-deep-navy hover:bg-slate-800 text-white rounded-full px-6 shadow-lg shadow-deep-navy/20 transition-all hover:scale-105">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('newReport')}
                </Button>
              </Link>
            </div>

            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                   <div className="text-3xl font-black text-deep-navy">{stats.totalReports}</div>
                   <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('stats.totalReports')}</div>
                </div>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                   <div className="text-3xl font-black text-deep-navy">{stats.resolvedIssues}</div>
                   <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('stats.fixedIssues')}</div>
                </div>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <ThumbsUp className="w-7 h-7" />
                </div>
                <div>
                   <div className="text-3xl font-black text-deep-navy">{stats.totalUpvotes}</div>
                   <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('stats.communityImpact')}</div>
                </div>
              </motion.div>
            </div>

            {isIssuesLoading ? (
              // Skeleton Loader
              <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="break-inside-avoid bg-white rounded-3xl overflow-hidden h-64 animate-pulse bg-gray-200" style={{ height: Math.random() * 200 + 200 }} />
                ))}
              </div>
            ) : issues.length === 0 ? (
              // Enhanced Empty State with Local Context
              <div className="space-y-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[2.5rem] p-8 border border-zinc-100 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                     <div className="flex-1 text-center md:text-left">
                       <h3 className="text-2xl font-bold text-deep-navy mb-3">{t('empty.title')}</h3>
                       <p className="text-slate-500 mb-6 font-medium">
                         {t('empty.desc')}
                       </p>
                       <Link href={`/${locale}/report`}>
                         <Button className="bg-teal-primary hover:bg-teal-600 text-white rounded-full px-8 shadow-lg shadow-teal-900/10">
                           {t('empty.reportAction')}
                         </Button>
                       </Link>
                     </div>
                    <div className="w-full md:w-1/2 aspect-video overflow-hidden rounded-3xl border border-zinc-100 shadow-sm">
                      <CommunityMap 
                        issues={nearbyIssues} 
                        zoom={12} 
                        center={nearbyIssues.length > 0 ? [nearbyIssues[0].lat || 9.0192, nearbyIssues[0].lng || 38.7525] as [number, number] : [9.0192, 38.7525]}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Local Area Activity */}
                 <div className="space-y-6">
                   <div className="flex items-center justify-between">
                     <h2 className="text-xl font-black text-deep-navy tracking-tight uppercase">
                       {t('nearby.title', { location: profile?.residence || (locale === 'am' ? 'አካባቢዎ' : 'Your Area') })}
                     </h2>
                     <Link href={`/${locale}/issues`} className="text-xs font-bold text-teal-600 hover:underline">{t('nearby.viewAll')}</Link>
                   </div>
                  
                  {isNearbyLoading ? (
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="min-w-[300px] h-40 bg-white rounded-2xl border border-zinc-100 animate-pulse" />
                      ))}
                    </div>
                   ) : nearbyIssues.length === 0 ? (
                     <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                       <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t('nearby.noNearby')}</p>
                     </div>
                   ) : (
                    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 px-2 -mx-2 scrollbar-hide">
                      {nearbyIssues.map((issue) => (
                        <Link 
                          key={issue.id} 
                          href={`/${locale}/issues/${issue.id}`}
                          className="min-w-[300px] bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm hover:shadow-xl hover:shadow-teal-900/5 transition-all group shrink-0"
                        >
                          <div className="flex gap-4">
                            <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                              {issue.images?.[0] ? (
                                <img src={issue.images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <MapPin className="w-6 h-6" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-deep-navy text-sm mb-1 line-clamp-2 truncate min-h-[40px] leading-tight group-hover:text-teal-primary transition-colors">
                                {issue.title}
                              </h4>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] font-black uppercase text-teal-600">
                                  {statuses[issue.status as Status]?.label[locale as 'en' | 'am'] || issue.status}
                                </span>
                                <div className="flex items-center text-[10px] font-bold text-slate-400">
                                  <ThumbsUp className="w-3 h-3 mr-1" />
                                  {issue.upvote_count}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Masonry Grid
              <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                <AnimatePresence>
                  {issues.map((issue, index) => (
                    <motion.div
                      key={issue.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="break-inside-avoid"
                    >
                      <Link href={`/${locale}/issues/${issue.id}`} className="block group">
                        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-300 transform group-hover:-translate-y-2">
                          
                          {/* Image & Status Badge */}
                          <div className="relative aspect-[4/3] overflow-hidden">
                            {issue.images && issue.images[0] ? (
                              <img 
                                src={issue.images[0]} 
                                alt={issue.title} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                  <MapPin className="w-8 h-8 text-slate-300" />
                                </div>
                            )}
                            
                            <div className="absolute top-4 left-4">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border border-white/20 shadow-sm",
                                issue.status === 'resolved' ? "bg-green-500/90 text-white" :
                                issue.status === 'in_progress' ? "bg-blue-500/90 text-white" :
                                "bg-white/90 text-slate-700"
                              )}>
                                {statuses[issue.status as Status]?.label[locale as 'en' | 'am'] || issue.status}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-6">
                            <h3 className="font-bold text-deep-navy text-lg mb-2 line-clamp-2 leading-snug group-hover:text-teal-primary transition-colors">
                              {issue.title}
                            </h3>
                            
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                              <div className="flex items-center text-slate-400 text-xs font-medium uppercase tracking-wider">
                                <Clock className="w-3 h-3 mr-1.5" />
                                {formatDate(issue.created_at, locale)}
                              </div>
                              
                              <div className="flex items-center text-teal-600 font-bold text-sm bg-teal-50 px-3 py-1 rounded-full">
                                <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                                {issue.upvote_count}
                              </div>
                            </div>
                          </div>

                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
