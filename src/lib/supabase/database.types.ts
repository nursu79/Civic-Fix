export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          display_name: string | null
          phone: string | null
          avatar_url: string | null
          role: 'citizen' | 'admin'
          language: 'en' | 'am'
          residence: string | null
          bio: string | null
          notify_sms: boolean
          reputation_points: number
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          display_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'citizen' | 'admin'
          language?: 'en' | 'am'
          residence?: string | null
          bio?: string | null
          notify_sms?: boolean
          reputation_points?: number
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          display_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'citizen' | 'admin'
          language?: 'en' | 'am'
          residence?: string | null
          bio?: string | null
          notify_sms?: boolean
          reputation_points?: number
          created_at?: string
        }
      }
      issues: {
        Row: {
          id: string
          title: string
          description: string | null
          category: 'roads' | 'water' | 'sanitation' | 'lighting' | 'safety' | 'parks'
          status: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority_score: number
          lat: number | null
          lng: number | null
          address: string | null
          images: string[]
          reporter_id: string
          assigned_to: string | null
          upvote_count: number
          comment_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category: 'roads' | 'water' | 'sanitation' | 'lighting' | 'safety' | 'parks'
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority_score?: number
          lat?: number | null
          lng?: number | null
          address?: string | null
          images?: string[]
          reporter_id: string
          assigned_to?: string | null
          upvote_count?: number
          comment_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category?: 'roads' | 'water' | 'sanitation' | 'lighting' | 'safety' | 'parks'
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority_score?: number
          lat?: number | null
          lng?: number | null
          address?: string | null
          images?: string[]
          reporter_id?: string
          assigned_to?: string | null
          upvote_count?: number
          comment_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      upvotes: {
        Row: {
          id: string
          issue_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          issue_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          issue_id?: string
          user_id?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          issue_id: string
          user_id: string
          content: string
          is_official: boolean
          created_at: string
        }
        Insert: {
          id?: string
          issue_id: string
          user_id: string
          content: string
          is_official?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          issue_id?: string
          user_id?: string
          content?: string
          is_official?: boolean
          created_at?: string
        }
      }
      status_history: {
        Row: {
          id: string
          issue_id: string
          old_status: string | null
          new_status: string
          changed_by: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          issue_id: string
          old_status?: string | null
          new_status: string
          changed_by: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          issue_id?: string
          old_status?: string | null
          new_status?: string
          changed_by?: string
          note?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'status_change' | 'upvote' | 'comment' | 'follow' | 'system'
          title: string
          message: string
          link: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'status_change' | 'upvote' | 'comment' | 'follow' | 'system'
          title: string
          message: string
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'status_change' | 'upvote' | 'comment' | 'follow' | 'system'
          title?: string
          message?: string
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
      issue_follows: {
        Row: {
          id: string
          issue_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          issue_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          issue_id?: string
          user_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_nearby_duplicates: {
        Args: {
          lat: number
          lng: number
          cat: string
        }
        Returns: Database['public']['Tables']['issues']['Row'][]
      }
      recalculate_all_priorities: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience types
export type Profile = Tables<'profiles'>
export type Issue = Tables<'issues'>
export type Upvote = Tables<'upvotes'>
export type Comment = Tables<'comments'>
export type StatusHistory = Tables<'status_history'>
export type Notification = Tables<'notifications'>
export type IssueFollow = Tables<'issue_follows'>
