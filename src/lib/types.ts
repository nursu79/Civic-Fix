import { Category, Status } from '@/lib/utils';

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: Status;
  priority_score: number;
  lat?: number | null;
  lng?: number | null;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  images: string[];
  reporter_id: string;
  reporter_name: string;
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
  username: string;
  email?: string;
  display_name: string;
  phone?: string;
  avatar_url?: string;
  role: 'citizen' | 'admin';
  language: 'en' | 'am';
  residence?: string;
  bio?: string;
  notify_sms?: boolean;
  reputation_points?: number;
  created_at: string;
}

// Mock data for development
export const mockIssues: Issue[] = [
  {
    id: '1',
    title: 'Large pothole on Bole Road',
    description: 'There is a dangerous pothole near the traffic light that has been causing accidents. Multiple vehicles have been damaged.',
    category: 'roads',
    status: 'open',
    priority_score: 85,
    location: { lat: 9.0192, lng: 38.7525 },
    address: 'Bole Road, near Friendship Hotel',
    images: [],
    reporter_id: 'user1',
    reporter_name: 'Abebe K.',
    upvote_count: 142,
    comment_count: 23,
    follow_count: 5,
    created_at: '2024-12-25T10:30:00Z',
    updated_at: '2024-12-27T08:15:00Z',
    has_upvoted: false,
  },
  {
    id: '2',
    title: 'Street lights not working',
    description: 'The entire block of street lights on Mexico Square have been out for two weeks. The area is very dark and unsafe at night.',
    category: 'lighting',
    status: 'in_progress',
    priority_score: 72,
    location: { lat: 9.0105, lng: 38.7612 },
    address: 'Mexico Square, Lideta',
    images: [],
    reporter_id: 'user2',
    reporter_name: 'Sara M.',
    upvote_count: 89,
    comment_count: 15,
    follow_count: 3,
    created_at: '2024-12-20T14:00:00Z',
    updated_at: '2024-12-26T16:30:00Z',
    has_upvoted: true,
  },
  {
    id: '3',
    title: 'Water pipe burst on Churchill Avenue',
    description: 'A major water pipe has burst and water is flooding the street. Roads are becoming impassable.',
    category: 'water',
    status: 'resolved',
    priority_score: 95,
    location: { lat: 9.0228, lng: 38.7469 },
    address: 'Churchill Avenue, Piassa',
    images: [],
    reporter_id: 'user3',
    reporter_name: 'Daniel T.',
    upvote_count: 234,
    comment_count: 45,
    follow_count: 12,
    created_at: '2024-12-15T08:00:00Z',
    updated_at: '2024-12-17T12:00:00Z',
    has_upvoted: false,
  },
  {
    id: '4',
    title: 'Overflowing garbage bins at Merkato',
    description: 'The garbage collection has stopped for days. Bins are overflowing and causing health hazards.',
    category: 'sanitation',
    status: 'open',
    priority_score: 68,
    location: { lat: 9.0300, lng: 38.7400 },
    address: 'Central Merkato Market',
    images: [],
    reporter_id: 'user4',
    reporter_name: 'Tigist H.',
    upvote_count: 178,
    comment_count: 32,
    follow_count: 8,
    created_at: '2024-12-26T09:00:00Z',
    updated_at: '2024-12-27T10:00:00Z',
    has_upvoted: false,
  },
  {
    id: '5',
    title: 'Broken playground equipment',
    description: 'The swings and slides at the children\'s park are broken and rusted. It is unsafe for children.',
    category: 'parks',
    status: 'open',
    priority_score: 45,
    location: { lat: 9.0150, lng: 38.7600 },
    address: 'Unity Park, near City Hall',
    images: [],
    reporter_id: 'user5',
    reporter_name: 'Yonas B.',
    upvote_count: 67,
    comment_count: 12,
    follow_count: 2,
    created_at: '2024-12-22T11:30:00Z',
    updated_at: '2024-12-24T09:00:00Z',
    has_upvoted: true,
  },
  {
    id: '6',
    title: 'Dangerous open manhole',
    description: 'A manhole cover is missing on the pedestrian walkway. Several people have almost fallen in.',
    category: 'safety',
    status: 'in_progress',
    priority_score: 92,
    location: { lat: 9.0180, lng: 38.7550 },
    address: 'Kazanchis, near Commercial Bank',
    images: [],
    reporter_id: 'user6',
    reporter_name: 'Helen G.',
    upvote_count: 156,
    comment_count: 28,
    follow_count: 4,
    created_at: '2024-12-24T15:00:00Z',
    updated_at: '2024-12-26T14:00:00Z',
    has_upvoted: false,
  },
];
