import { Department } from './types';

export interface SectorThemeConfig {
  id: Department;
  title: string;
  subtitle: string;
  badgeBg: string;
  badgeText: string;
  sidebarGradient: string;
  sidebarBorder: string;
  cardBorder: string;
  primaryButton: string;
  accentText: string;
  accentBg: string;
  sidebarBg: string;
  sidebarActive: string;
  sidebarHover: string;
}

export const SECTOR_THEMES: Record<Department, SectorThemeConfig> = {
  roads: {
    id: 'roads',
    title: 'Roads & Public Works Dept',
    subtitle: 'Asphalt maintenance, pothole repairs, & traffic infrastructure dispatch',
    badgeBg: 'bg-amber-100/90',
    badgeText: 'text-amber-900',
    sidebarGradient: 'from-[#fff7ed] via-[#ffedd5] to-[#f97316]/10',
    sidebarBorder: 'border-amber-200/90',
    cardBorder: 'border-amber-200/80',
    primaryButton: 'bg-amber-600 hover:bg-amber-700 text-white',
    accentText: 'text-amber-700',
    accentBg: 'bg-amber-50',
    sidebarBg: 'bg-[#451a03]', // Dark Amber
    sidebarActive: 'bg-amber-500/30 text-amber-200 border-l-4 border-amber-400',
    sidebarHover: 'hover:bg-white/10 text-amber-100/80 hover:text-amber-100',
  },
  water: {
    id: 'water',
    title: 'Water & Sewerage Authority',
    subtitle: 'Pipe repairs, clean water supply, leak detection, & drainage dispatch',
    badgeBg: 'bg-sky-100/90',
    badgeText: 'text-sky-900',
    sidebarGradient: 'from-[#f0f9ff] via-[#e0f2fe] to-[#0284c7]/10',
    sidebarBorder: 'border-sky-200/90',
    cardBorder: 'border-sky-200/80',
    primaryButton: 'bg-sky-600 hover:bg-sky-700 text-white',
    accentText: 'text-sky-700',
    accentBg: 'bg-sky-50',
    sidebarBg: 'bg-[#0c4a6e]', // Dark Ocean Blue
    sidebarActive: 'bg-sky-500/30 text-sky-200 border-l-4 border-sky-400',
    sidebarHover: 'hover:bg-white/10 text-sky-100/80 hover:text-sky-100',
  },
  lighting: {
    id: 'lighting',
    title: 'Electrical Grid & Power Dept',
    subtitle: 'Street lighting, power outages, grid safety, & transformer dispatch',
    badgeBg: 'bg-yellow-100/90',
    badgeText: 'text-yellow-950',
    sidebarGradient: 'from-[#fefce8] via-[#fef9c3] to-[#eab308]/10',
    sidebarBorder: 'border-yellow-200/90',
    cardBorder: 'border-yellow-200/80',
    primaryButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    accentText: 'text-yellow-800',
    accentBg: 'bg-yellow-50',
    sidebarBg: 'bg-[#422006]', // Dark Yellow/Gold
    sidebarActive: 'bg-yellow-500/30 text-yellow-200 border-l-4 border-yellow-400',
    sidebarHover: 'hover:bg-white/10 text-yellow-100/80 hover:text-yellow-100',
  },
  parks: {
    id: 'parks',
    title: 'Parks & Environment Bureau',
    subtitle: 'Public park maintenance, urban greenery, tree trimming, & lake care',
    badgeBg: 'bg-emerald-100/90',
    badgeText: 'text-emerald-900',
    sidebarGradient: 'from-[#f0fdf4] via-[#dcfce7] to-[#16a34a]/10',
    sidebarBorder: 'border-emerald-200/90',
    cardBorder: 'border-emerald-200/80',
    primaryButton: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    accentText: 'text-emerald-700',
    accentBg: 'bg-emerald-50',
    sidebarBg: 'bg-[#064e3b]', // Dark Emerald Green
    sidebarActive: 'bg-emerald-500/30 text-emerald-200 border-l-4 border-emerald-400',
    sidebarHover: 'hover:bg-white/10 text-emerald-100/80 hover:text-emerald-100',
  },
  sanitation: {
    id: 'sanitation',
    title: 'Sanitation & Waste Management',
    subtitle: 'Waste collection, illegal dumping cleanup, & public hygiene dispatch',
    badgeBg: 'bg-purple-100/90',
    badgeText: 'text-purple-900',
    sidebarGradient: 'from-[#faf5ff] via-[#f3e8ff] to-[#9333ea]/10',
    sidebarBorder: 'border-purple-200/90',
    cardBorder: 'border-purple-200/80',
    primaryButton: 'bg-purple-600 hover:bg-purple-700 text-white',
    accentText: 'text-purple-700',
    accentBg: 'bg-purple-50',
    sidebarBg: 'bg-[#3b0764]', // Dark Purple
    sidebarActive: 'bg-purple-500/30 text-purple-200 border-l-4 border-purple-400',
    sidebarHover: 'hover:bg-white/10 text-purple-100/80 hover:text-purple-100',
  },
  safety: {
    id: 'safety',
    title: 'Public Safety & Hazard Response',
    subtitle: 'Structural hazards, emergency barriers, sidewalk holes, & risk mitigation',
    badgeBg: 'bg-rose-100/90',
    badgeText: 'text-rose-900',
    sidebarGradient: 'from-[#fff1f2] via-[#ffe4e6] to-[#e11d48]/10',
    sidebarBorder: 'border-rose-200/90',
    cardBorder: 'border-rose-200/80',
    primaryButton: 'bg-rose-600 hover:bg-rose-700 text-white',
    accentText: 'text-rose-700',
    accentBg: 'bg-rose-50',
    sidebarBg: 'bg-[#4c0519]', // Dark Crimson Rose
    sidebarActive: 'bg-rose-500/30 text-rose-200 border-l-4 border-rose-400',
    sidebarHover: 'hover:bg-white/10 text-rose-100/80 hover:text-rose-100',
  },
  general: {
    id: 'general',
    title: 'Municipal Services & Dispatch',
    subtitle: 'General civic issue coordination & cross-departmental dispatch',
    badgeBg: 'bg-teal-100/90',
    badgeText: 'text-teal-900',
    sidebarGradient: 'from-[#e2f7ee] via-[#e8f8f2] to-[#0d9488]/10',
    sidebarBorder: 'border-teal-200/90',
    cardBorder: 'border-teal-200/80',
    primaryButton: 'bg-teal-600 hover:bg-teal-700 text-white',
    accentText: 'text-teal-700',
    accentBg: 'bg-teal-50',
    sidebarBg: 'bg-[#132e35]', // Dark Teal Navy
    sidebarActive: 'bg-teal-500/30 text-teal-200 border-l-4 border-teal-400',
    sidebarHover: 'hover:bg-white/10 text-teal-100/80 hover:text-teal-100',
  },
};

export function getSectorTheme(department?: Department | string | null): SectorThemeConfig {
  if (!department) return SECTOR_THEMES.general;
  const key = department.toLowerCase() as Department;
  return SECTOR_THEMES[key] || SECTOR_THEMES.general;
}
