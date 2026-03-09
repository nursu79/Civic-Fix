'use client';

import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Status, Category, statuses, categories } from '@/lib/utils';

// Status Badge
interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: Status;
  locale?: 'en' | 'am';
}

export function StatusBadge({ status, locale = 'en', className, ...props }: StatusBadgeProps) {
  const config = statuses[status];
  const labelMapEn: Record<Status, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed'
  };

  const labelMapAm: Record<Status, string> = {
    open: 'ክፍት',
    in_progress: 'በሂደት ላይ',
    resolved: 'የተፈታ',
    closed: 'የተዘጋ'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
        `status-${status}`,
        locale === 'am' && 'font-ethiopic',
        className
      )}
      {...props}
    >
      <span
        className="w-1.5 h-1.5 rounded-full mr-2"
        style={{ backgroundColor: config.color }}
      />
      {locale === 'am' ? labelMapAm[status] : labelMapEn[status]}
    </span>
  );
}

// Category Badge
interface CategoryBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  category: Category;
  locale?: 'en' | 'am';
}

export function CategoryBadge({ category, locale = 'en', className, ...props }: CategoryBadgeProps) {
  const config = categories[category];
  const categoryMapEn: Record<Category, string> = {
    roads: 'Roads',
    water: 'Water',
    sanitation: 'Sanitation',
    lighting: 'Lighting',
    safety: 'Safety',
    parks: 'Parks'
  };

  const categoryMapAm: Record<Category, string> = {
    roads: 'መንገዶች',
    water: 'ውሃ',
    sanitation: 'ጽዳት',
    lighting: 'መብራት',
    safety: 'ደህንነት',
    parks: 'ፓርኮች'
  };

  return (
    <span
      className={cn(
        'tag-instrument',
        locale === 'am' && 'font-ethiopic',
        className
      )}
      style={{ 
        color: config.color,
        borderColor: `${config.color}30`,
        backgroundColor: `${config.color}08`
      }}
      {...props}
    >
      {locale === 'am' ? categoryMapAm[category] : categoryMapEn[category]}
    </span>
  );
}

// Generic Badge
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const badgeVariants = {
  default: 'bg-glass-bg border-glass-border text-text-secondary',
  success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  warning: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  error: 'bg-red-500/15 border-red-500/30 text-red-400',
  info: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
};

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
