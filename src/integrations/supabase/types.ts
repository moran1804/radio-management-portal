export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      djs: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          icecast_address: string | null
          icecast_mountpoint: string | null
          icecast_password_encrypted: string | null
          icecast_port: number | null
          icecast_username: string | null
          id: string
          profile_picture_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name: string
          icecast_address?: string | null
          icecast_mountpoint?: string | null
          icecast_password_encrypted?: string | null
          icecast_port?: number | null
          icecast_username?: string | null
          id?: string
          profile_picture_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          icecast_address?: string | null
          icecast_mountpoint?: string | null
          icecast_password_encrypted?: string | null
          icecast_port?: number | null
          icecast_username?: string | null
          id?: string
          profile_picture_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      external_storage: {
        Row: {
          active: boolean
          config: Json | null
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          config?: Json | null
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json | null
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      jingles: {
        Row: {
          active: boolean
          created_at: string
          duration: number | null
          file_path: string | null
          id: string
          name: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration?: number | null
          file_path?: string | null
          id?: string
          name: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          duration?: number | null
          file_path?: string | null
          id?: string
          name?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      job_events: {
        Row: {
          id: number
          job_id: string
          level: string
          message: string
          ts: string
        }
        Insert: {
          id?: number
          job_id: string
          level?: string
          message?: string
          ts?: string
        }
        Update: {
          id?: number
          job_id?: string
          level?: string
          message?: string
          ts?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          created_at: string
          id: string
          pid: number | null
          run_at: string
          schedule_id: string | null
          show_id: string | null
          status: string
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pid?: number | null
          run_at: string
          schedule_id?: string | null
          show_id?: string | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pid?: number | null
          run_at?: string
          schedule_id?: string | null
          show_id?: string | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_jobs_schedule"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_jobs_schedule_id"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_jobs_show"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          icecast_address: string | null
          icecast_mountpoint: string | null
          icecast_password_encrypted: string | null
          icecast_port: number | null
          icecast_username: string | null
          id: string
          name: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icecast_address?: string | null
          icecast_mountpoint?: string | null
          icecast_password_encrypted?: string | null
          icecast_port?: number | null
          icecast_username?: string | null
          id?: string
          name: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icecast_address?: string | null
          icecast_mountpoint?: string | null
          icecast_password_encrypted?: string | null
          icecast_port?: number | null
          icecast_username?: string | null
          id?: string
          name?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_slots: {
        Row: {
          active: boolean
          created_at: string
          day_of_week: number
          description: string | null
          dj_id: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          is_active: boolean
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          day_of_week: number
          description?: string | null
          dj_id?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          day_of_week?: number
          description?: string | null
          dj_id?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_recurring_slots_dj"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "djs"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          show_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          show_id: string
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          show_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_schedules_show"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      show_recordings: {
        Row: {
          created_at: string
          duration: number | null
          file_path: string | null
          id: string
          show_id: string | null
          status: string
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          file_path?: string | null
          id?: string
          show_id?: string | null
          status?: string
          storage_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          file_path?: string | null
          id?: string
          show_id?: string | null
          status?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_show_recordings_show"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          created_at: string
          description: string | null
          dj_id: string | null
          duration_seconds: number | null
          end_time: string | null
          file_path: string | null
          id: string
          recurring_slot_id: string | null
          scheduled_by: string | null
          show_type: string
          start_time: string | null
          status: string
          storage_path: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          dj_id?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          file_path?: string | null
          id?: string
          recurring_slot_id?: string | null
          scheduled_by?: string | null
          show_type?: string
          start_time?: string | null
          status?: string
          storage_path?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          dj_id?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          file_path?: string | null
          id?: string
          recurring_slot_id?: string | null
          scheduled_by?: string | null
          show_type?: string
          start_time?: string | null
          status?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_shows_dj"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_shows_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      station_config: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      streaming_credentials: {
        Row: {
          address: string
          created_at: string
          id: string
          mountpoint: string
          password: string
          port: number
          type: string
          updated_at: string
          username: string
        }
        Insert: {
          address?: string
          created_at?: string
          id?: string
          mountpoint?: string
          password?: string
          port?: number
          type?: string
          updated_at?: string
          username?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          mountpoint?: string
          password?: string
          port?: number
          type?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_show_conflict: {
        Args: {
          p_end_time: string
          p_exclude_show_id?: string
          p_start_time: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
