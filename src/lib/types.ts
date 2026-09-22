import { Category, Status } from '@/lib/utils';

export type Department = 'roads' | 'water' | 'lighting' | 'parks' | 'sanitation' | 'safety' | 'general';

export interface SectorTheme {
  id: Department;
  name: string;
  badgeBg: string;
  badgeText: string;
  gradientBg: string;
  borderColor: string;
  accentColor: string;
  iconName: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  status: Status;
  priority_score: number;
  /** Flat lat/lng — canonical shape returned by the API */
  lat: number | null;
  lng: number | null;
  address: string | null;
  images: string[];
  reporter_id: string;
  reporter_name: string;
  assigned_department?: Department;
  assigned_officer_id?: string | null;
  subcity?: string | null;
  assigned_unit?: string | null;
  dispatched_at?: string | null;
  resolution_images?: string[];
  resolution_notes?: string | null;
  billing_cost?: number | null;
  resolved_at?: string | null;
  upvote_count: number;
  comment_count: number;
  follow_count: number;
  created_at: string;
  updated_at: string;
  has_upvoted?: boolean;
}

export interface Comment {
  id: string;
  issue_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  is_official: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  username?: string;
  email?: string;
  display_name: string;
  phone?: string;
  avatar_url?: string;
  role: 'citizen' | 'department_officer' | 'admin';
  department?: Department;
  language: 'en' | 'am';
  residence?: string;
  bio?: string;
  notify_sms?: boolean;
  reputation_points?: number;
  created_at: string;
}

// Mock data for local development only — NOT for production use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _mockIssues: Issue[] = [
  {
    id: '1',
    title: 'Large pothole on Bole Road',
    description: 'There is a dangerous pothole near the traffic light that has been causing accidents.',
    category: 'roads',
    status: 'open',
    priority_score: 85,
    lat: 9.0192,
    lng: 38.7525,
    address: 'Bole Road, near Friendship Hotel',
    images: [],
    reporter_id: 'user1',
    reporter_name: 'Abebe K.',
    upvote_count: 142,
    comment_count: 23,
    follow_count: 5,
    created_at: '2024-12-25T10:30:00Z',
    updated_at: '2024-12-27T08:15:00Z',
  },
  {
    id: '2',
    title: 'Street lights not working',
    description: 'The entire block of street lights on Mexico Square have been out for two weeks.',
    category: 'lighting',
    status: 'in_progress',
    priority_score: 72,
    lat: 9.0105,
    lng: 38.7612,
    address: 'Mexico Square, Lideta',
    images: [],
    reporter_id: 'user2',
    reporter_name: 'Sara M.',
    upvote_count: 89,
    comment_count: 15,
    follow_count: 3,
    created_at: '2024-12-20T14:00:00Z',
    updated_at: '2024-12-26T16:30:00Z',
  },
];
