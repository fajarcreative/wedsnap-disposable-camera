export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
        };
      };
      events: {
        Row: {
          id: string;
          admin_id: string;
          title: string;
          event_date: string;
          location: string | null;
          cover_url: string | null;
          photo_limit: number;
          gallery_mode: 'public' | 'locked';
          slug: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          admin_id: string;
          title: string;
          event_date: string;
          location?: string | null;
          cover_url?: string | null;
          photo_limit?: number;
          gallery_mode?: 'public' | 'locked';
          slug: string;
        };
        Update: {
          title?: string;
          event_date?: string;
          location?: string | null;
          cover_url?: string | null;
          photo_limit?: number;
          gallery_mode?: 'public' | 'locked';
          is_active?: boolean;
        };
      };
      camera_sessions: {
        Row: {
          id: string;
          event_id: string;
          device_id: string;
          guest_name: string | null;
          photos_taken: number;
          max_photos: number;
          created_at: string;
          last_active: string;
        };
        Insert: {
          event_id: string;
          device_id: string;
          guest_name?: string | null;
          max_photos?: number;
        };
        Update: {
          photos_taken?: number;
          guest_name?: string | null;
          last_active?: string;
        };
      };
      photos: {
        Row: {
          id: string;
          event_id: string;
          session_id: string;
          storage_path: string;
          public_url: string | null;
          file_size: number;
          mime_type: string;
          width: number | null;
          height: number | null;
          upload_status: 'pending' | 'uploading' | 'success' | 'failed';
          created_at: string;
        };
        Insert: {
          event_id: string;
          session_id: string;
          storage_path: string;
          public_url?: string | null;
          file_size: number;
          mime_type: string;
          width?: number | null;
          height?: number | null;
          upload_status?: 'pending' | 'uploading' | 'success' | 'failed';
        };
        Update: {
          public_url?: string | null;
          upload_status?: 'pending' | 'uploading' | 'success' | 'failed';
        };
      };
    };
  };
}

export type Event = Database['public']['Tables']['events']['Row'];
export type EventInsert = Database['public']['Tables']['events']['Insert'];
export type CameraSession = Database['public']['Tables']['camera_sessions']['Row'];
export type Photo = Database['public']['Tables']['photos']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
