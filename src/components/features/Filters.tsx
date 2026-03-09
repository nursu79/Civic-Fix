'use client';

import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Category, categories } from '@/lib/utils';
import { 
  Route, 
  Droplets, 
  Trash2, 
  Lightbulb, 
  ShieldAlert, 
  Trees,
  X
} from 'lucide-react';

const iconMap = {
  roads: Route,
  water: Droplets,
  sanitation: Trash2,
  lighting: Lightbulb,
  safety: ShieldAlert,
  parks: Trees,
};

interface CategoryFilterProps {
  selectedCategory: Category | 'all';
  onSelectCategory: (category: Category | 'all') => void;
}

export function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isAmharic = locale === 'am';

  const allCategories = Object.entries(categories) as [Category, typeof categories[Category]][];

  return (
    <div className="relative">
      {/* Scrollable container */}
      <div className="flex gap-2.5 overflow-x-auto pb-4 pt-2 -mx-2 px-2 scrollbar-hide relative z-10 w-full justify-start lg:justify-center">
        {/* All filter */}
        <button
          onClick={() => onSelectCategory('all')}
          className={cn(
            "relative flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 font-bold tracking-tight border",
            selectedCategory === 'all'
              ? "text-white border-transparent"
              : "bg-white border-zinc-200 text-slate-gray hover:border-teal-primary/30 hover:bg-teal-primary/5",
            isAmharic && 'font-ethiopic'
          )}
        >
          {selectedCategory === 'all' && (
            <motion.div
              layoutId="activeCategory"
              className="absolute inset-0 bg-deep-navy rounded-full"
              style={{ boxShadow: '0 8px 16px rgba(17, 17, 17, 0.15)' }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10">{t('issues.filterAll')}</span>
        </button>

        {/* Category chips */}
        {allCategories.map(([key, config]) => {
          const Icon = iconMap[key];
          const isSelected = selectedCategory === key;

          return (
            <button
              key={key}
              onClick={() => onSelectCategory(key)}
              className={cn(
                "relative flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 font-bold tracking-tight border",
                isSelected
                  ? "text-white border-transparent"
                  : "bg-white border-zinc-200 text-slate-gray hover:border-teal-primary/30 hover:bg-teal-primary/5",
                isAmharic && 'font-ethiopic'
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeCategory"
                  className="absolute inset-0 rounded-full"
                  style={{ 
                    backgroundColor: config.color,
                    boxShadow: `0 8px 16px ${config.color}40`
                  }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon className={cn("w-4 h-4 relative z-10", isSelected ? "text-white" : "")} />
              <span className="relative z-10">{config.label[locale as 'en' | 'am']}</span>
            </button>
          );
        })}
      </div>

      {/* Fade edges for scroll indication on mobile */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-20 lg:hidden" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-20 lg:hidden" />
    </div>
  );
}

// Sort options component
interface SortDropdownProps {
  selectedSort: string;
  onSelectSort: (sort: string) => void;
}

export function SortDropdown({ selectedSort, onSelectSort }: SortDropdownProps) {
  const t = useTranslations('issues');
  const locale = useLocale();
  const isAmharic = locale === 'am';

  const sortOptions = [
    { value: 'recent', label: t('sortRecent') },
    { value: 'popular', label: t('sortPopular') },
    { value: 'priority', label: t('sortPriority') },
    { value: 'following', label: t('sortFollowing') },
  ];

  return (
    <select
      value={selectedSort}
      onChange={(e) => onSelectSort(e.target.value)}
      className={cn(
        "bg-white border border-zinc-200 px-5 py-2.5 rounded-xl text-deep-navy font-bold tracking-tight",
        "focus:outline-none focus:ring-2 focus:ring-teal-primary/20",
        "cursor-pointer appearance-none",
        isAmharic && 'font-ethiopic'
      )}
      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23888\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px', paddingRight: '40px' }}
    >
      {sortOptions.map((option) => (
        <option key={option.value} value={option.value} className="bg-white">
          {option.label}
        </option>
      ))}
    </select>
  );
}
