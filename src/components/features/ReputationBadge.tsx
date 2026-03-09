'use client';

import React from 'react';
import { Shield, Award, Star, Zap, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReputationBadgeProps {
  points: number;
  className?: string;
  showPoints?: boolean;
}

export function ReputationBadge({ points = 0, className, showPoints = true }: ReputationBadgeProps) {
  // Levels logic
  const getLevel = (pts: number) => {
    if (pts >= 1000) return { name: 'Community Hero', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' };
    if (pts >= 500) return { name: 'Lead Reporter', icon: Zap, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' };
    if (pts >= 200) return { name: 'Active Citizen', icon: Star, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (pts >= 50) return { name: 'Committed Resident', icon: Award, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' };
    return { name: 'Novice Reporter', icon: Shield, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' };
  };

  const level = getLevel(points);
  const Icon = level.icon;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all hover:scale-105",
        level.bg,
        level.border
      )}>
        <Icon className={cn("w-4 h-4", level.color)} />
        <span className={cn("text-[10px] font-black uppercase tracking-widest", level.color)}>
          {level.name}
        </span>
      </div>
      {showPoints && (
        <span className="text-[10px] font-bold text-slate-400">
          <span className="text-teal-600 font-black">{points}</span> POINTS
        </span>
      )}
    </div>
  );
}
