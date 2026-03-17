'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, List, Map, Search, SlidersHorizontal, CheckCircle2, Users, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui'; // Removed Card import as it's not used directly
import { IssueCard, IssueCardSkeleton, CategoryFilter, SortDropdown } from '@/components/features';
import { Issue } from '@/lib/types';
import { Category, Status, statuses, categories } from '@/lib/utils';
import { cn, formatNumber } from '@/lib/utils';
import { useIssues } from '@/hooks/useIssues';
import { useDebounce } from '@/hooks/useDebounce';
import { ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers';
import dynamic from 'next/dynamic';
import { CommunityMapProps } from '@/components/features/CommunityMap';

const CommunityMap = dynamic<CommunityMapProps>(() => import('@/components/features/CommunityMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse rounded-3xl" />
});

type ViewMode = 'grid' | 'list' | 'map';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, type: 'spring', stiffness: 100, damping: 20 },
  },
};

export default function IssuesPage() {
  const t = useTranslations('issues');
  const common = useTranslations('common');
  const locale = useLocale();
  const isAmharic = locale === 'am';

  const { profile, isLoading: isAuthLoading } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [sortBy, setSortBy] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Set initial state synchronously if profile is already loaded (from a client-side navigation)
  const [filterByResidence, setFilterByResidence] = useState<boolean>(!!profile?.residence);
  const [hasAutoSet, setHasAutoSet] = useState(!!profile?.residence);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  const supabase = createClient();

  useEffect(() => {
    // Prevent overwriting manual selections unless it's the very first load
    if (!hasAutoSet && !isAuthLoading && profile?.residence) {
      setFilterByResidence(true);
      setHasAutoSet(true);
    }
  }, [profile?.residence, isAuthLoading, hasAutoSet]);

  const { 
    issues, 
    isLoading, 
    totalCount,
    setPage,
    page,
    toggleUpvote 
  } = useIssues({ 
    category: selectedCategory, 
    sort: sortBy as any,
    limit: viewMode === 'map' ? 100 : 9, 
    search: debouncedSearch,
    location: filterByResidence ? (profile?.residence || '') : ''
  });

  const totalPages = Math.ceil(totalCount / 9);

  // Metrics (Synced with HomePage logic) - Now displayed in a ticker
  const metrics = [
    { label: t('statsReported'), value: 2847, icon: Search },
    { label: t('statsResolved'), value: 1923, icon: CheckCircle2 },
    { label: t('statsActive'), value: '12k', icon: Users },
    { label: t('statsResponse'), value: '3.2d', icon: Clock },
    { label: t('statsVerified'), value: '100%', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] selection:bg-teal-primary/20 pb-24">
      {/* Refined Header - Tier 1 */}
      <div className="relative bg-[#FAFAFA] pt-32 pb-4">
         <div className="max-w-[1600px] mx-auto px-6 sm:px-10">
            <div className="flex flex-col md:flex-row items-baseline justify-between gap-8">
               <div className="max-w-2xl">
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "text-4xl sm:text-6xl font-black text-deep-navy tracking-tight mb-4",
                      isAmharic && "font-ethiopic"
                    )}
                  >
                    {t('title')}
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={cn(
                      "text-lg text-slate-500 font-medium leading-relaxed",
                      isAmharic && "font-ethiopic"
                    )}
                  >
                    {t('subtitle')}
                  </motion.p>
               </div>
               
               {/* Minimalist Stats Ticker */}
               <div className="w-full md:w-auto overflow-hidden">
                  <div className="flex items-center gap-8 overflow-x-auto pb-4 scrollbar-hide md:justify-end">
                     {metrics.map((m, i) => (
                        <div key={i} className="flex flex-col items-start gap-1 shrink-0">
                           <span className="text-2xl font-bold text-deep-navy leading-none">{m.value}</span>
                           <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] text-slate-400", isAmharic && "font-ethiopic")}>{m.label}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Search & Filters Container (Compact & Static) */}
      <div className="max-w-5xl mx-auto px-6 sm:px-10 mb-12 relative z-20">
        <div className="flex flex-col items-center justify-center gap-6">
          
          {/* Minimalist Search */}
          <div className="relative w-full max-w-2xl transition-all duration-300 group shadow-sm rounded-full bg-white border border-zinc-200">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
            <input
              type="text"
              placeholder={common('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-14 pr-6 py-4 bg-transparent rounded-full",
                "text-base font-medium text-deep-navy placeholder:text-slate-400",
                "focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-transparent transition-all duration-300",
                isAmharic && 'font-ethiopic'
              )}
            />
          </div>

          {/* Filter Bar (Centered, Natural Flow) */}
          <div className="w-full flex flex-col items-center justify-center gap-4">
             {/* Category Chips */}
             <div className="w-full overflow-x-auto scrollbar-hide flex lg:justify-center">
                <CategoryFilter 
                  selectedCategory={selectedCategory} 
                  onSelectCategory={setSelectedCategory} 
                />
             </div>

             {/* View & Sort Controls */}
              <div className="flex items-center justify-center gap-3 shrink-0 overflow-x-auto scrollbar-hide">
                {profile && (
                  <Button
                    variant={filterByResidence ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => {
                      if (!profile.residence && !filterByResidence) {
                        alert(t('setResidenceAlert'));
                        return;
                      }
                      setFilterByResidence(!filterByResidence);
                    }}
                    className={cn(
                      "rounded-full text-[10px] font-bold tracking-widest uppercase transition-all",
                      !filterByResidence && "text-slate-400 border-zinc-200"
                    )}
                  >
                    <LocateFixed className="w-3.5 h-3.5 mr-2" />
                    {t('localReports')}
                  </Button>
                )}
                <SortDropdown selectedSort={sortBy} onSelectSort={setSortBy} />
                
                <div className="hidden sm:flex items-center gap-1 bg-white p-1 rounded-full border border-zinc-200 shadow-sm shadow-zinc-100/50">
                  {[
                    { id: 'grid', icon: LayoutGrid },
                    { id: 'list', icon: List }
                  ].map((mode) => (
                    <button
                       key={mode.id}
                       onClick={() => setViewMode(mode.id as ViewMode)}
                       className={cn(
                          "p-2.5 rounded-full transition-all duration-300",
                          viewMode === mode.id 
                            ? "bg-deep-navy text-white shadow-md shadow-deep-navy/20" 
                            : "text-slate-400 hover:text-deep-navy hover:bg-zinc-50"
                       )}
                    >
                       <mode.icon className="w-4 h-4" />
                    </button>
                  ))}
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Tier 3 */}
      <main className="max-w-[1600px] mx-auto px-6 sm:px-10 pt-4 pb-12 relative z-[10]">
         <AnimatePresence mode="wait">
            {viewMode === 'map' ? (
              <motion.div
                key="map"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative w-full rounded-[32px] overflow-hidden border border-zinc-200 shadow-2xl shadow-black/[0.04]"
                style={{ height: 680, background: '#faf9f5' }}
              >
                {/* Left overlay — inspired by reference */}
                <div className="absolute top-0 left-0 bottom-0 z-[1000] flex flex-col justify-between p-10 pointer-events-none"
                  style={{ width: 340, background: 'linear-gradient(to right, rgba(250,249,245,0.98) 60%, transparent)' }}>
                  
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-px w-8 bg-teal-600" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-600">
                        Community Presence
                      </span>
                    </div>
                    <h2 className="text-[42px] font-black leading-[1.0] tracking-tight mb-5" style={{ color: '#0f172a' }}>
                      OUR<br />LOCAL<br /><span className="text-teal-600">FOOTPRINT</span>
                    </h2>
                    <p className="text-[13px] text-slate-500 leading-relaxed max-w-[240px]">
                      Bridging citizens with local authorities through real-time reporting across the city.
                    </p>
                  </div>

                  {/* Category legend */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">Categories</p>
                    {Object.entries(categories).map(([key, cat]) => (
                      <div key={key} className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-[11px] font-bold text-slate-600">
                          {cat.label['en']}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* The actual map */}
                <CommunityMap issues={issues} />
              </motion.div>
            ) : (
               <>
                  {/* Masonry Grid */}
                  <motion.div
                     key={`${viewMode}-${page}`}
                     initial="hidden"
                     animate="visible"
                     variants={staggerContainer}
                     className={cn(
                        viewMode === 'grid' 
                           ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start"
                           : "flex flex-col gap-6 max-w-3xl mx-auto"
                     )}
                  >
                     {issues.length > 0 ? (
                        issues.map((issue) => (
                           <IssueCard 
                              key={issue.id}
                              issue={issue} 
                              view={viewMode as 'grid' | 'list'} 
                              onUpvote={toggleUpvote}
                           />
                        ))
                     ) : !isLoading && (
                        <div className="col-span-full py-24 text-center break-inside-avoid">
                           <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-50 mb-6">
                              <Search className="w-8 h-8 text-zinc-300" />
                           </div>
                           <h3 className="text-xl font-bold text-deep-navy mb-2">No issues found</h3>
                           <p className="text-slate-500">Try adjusting your filters or search query</p>
                        </div>
                     )}

                     {isLoading && (
                        Array.from({ length: 8 }).map((_, i) => (
                           <IssueCardSkeleton key={i} view={viewMode as 'grid' | 'list'} />
                        ))
                     )}
                  </motion.div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                     <div className="flex items-center justify-center gap-2 pt-12 pb-8">
                        <Button
                           variant="ghost"
                           onClick={() => setPage(page - 1)}
                           disabled={page === 0}
                           className="rounded-full"
                        >
                           <ChevronLeft className="w-4 h-4 mr-2" />
                           {common('prev')}
                        </Button>
                        <div className="flex items-center gap-1 px-4">
                           <span className="text-sm font-bold text-deep-navy">{common('page')} {page + 1}</span>
                           <span className="text-sm text-slate-400">{common('of')} {totalPages}</span>
                        </div>
                        <Button
                           variant="ghost"
                           onClick={() => setPage(page + 1)}
                           disabled={page === totalPages - 1}
                           className="rounded-full"
                        >
                           {common('next')}
                           <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                     </div>
                  )}
               </>
            )}
         </AnimatePresence>
      </main>
    </div>
  );
}
