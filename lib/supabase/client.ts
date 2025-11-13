import { createClient } from '@supabase/supabase-js';

// Supabase client configuration for browser/client-side use
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Client-side Supabase client (browser)
 * Uses anon key with RLS enabled
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // We manage sessions via JKKN OAuth
    detectSessionInUrl: false,
  },
});

/**
 * Create a Supabase client with user context for RLS
 * Sets app.user_id, app.user_role, app.user_department, app.user_institution
 * for Row Level Security policies
 */
export function createSupabaseClientWithContext(user: {
  jkkn_user_id: string;
  role: string;
  department_id?: string | null;
  institution_id?: string | null;
}) {
  const client = createClient(supabaseUrl, supabaseAnonKey);

  // Set user context for RLS policies
  const setContext = async () => {
    await client.rpc('set_config', {
      setting: 'app.user_id',
      value: user.jkkn_user_id,
    });
    await client.rpc('set_config', {
      setting: 'app.user_role',
      value: user.role,
    });
    if (user.department_id) {
      await client.rpc('set_config', {
        setting: 'app.user_department',
        value: user.department_id,
      });
    }
    if (user.institution_id) {
      await client.rpc('set_config', {
        setting: 'app.user_institution',
        value: user.institution_id,
      });
    }
  };

  setContext();

  return client;
}

/**
 * Database type definitions
 * Auto-generated from Supabase schema
 */
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          jkkn_user_id: string;
          email: string;
          full_name: string;
          role: string;
          department_id: string | null;
          institution_id: string | null;
          phone_number: string | null;
          gender: string | null;
          designation: string | null;
          avatar_url: string | null;
          is_super_admin: boolean;
          profile_completed: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      mentors: {
        Row: {
          id: string;
          user_id: string;
          department_id: string;
          institution_id: string;
          designation: string | null;
          specialization: string | null;
          total_students: number;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['mentors']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['mentors']['Insert']>;
      };
      students: {
        Row: {
          id: string;
          user_id: string | null;
          roll_number: string;
          name: string;
          email: string;
          department_id: string;
          institution_id: string;
          year: string | null;
          section: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['students']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['students']['Insert']>;
      };
      counseling_sessions: {
        Row: {
          id: string;
          mentor_id: string;
          student_id: string;
          session_name: string;
          date: string;
          time: string;
          notes: string | null;
          attachment_url: string | null;
          status: 'scheduled' | 'completed' | 'cancelled';
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['counseling_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['counseling_sessions']['Insert']>;
      };
      session_feedback: {
        Row: {
          id: string;
          session_id: string;
          counseling_queries: string;
          action_taken: string;
          submitted_by: string | null;
          submitted_at: string;
        };
        Insert: Omit<Database['public']['Tables']['session_feedback']['Row'], 'id' | 'submitted_at'>;
        Update: Partial<Database['public']['Tables']['session_feedback']['Insert']>;
      };
    };
  };
};
