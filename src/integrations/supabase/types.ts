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
      achievements: {
        Row: {
          achievement_level: string
          achievement_type: string | null
          badge_icon: string
          description: string | null
          id: string
          requirement_value: number | null
          title: string
        }
        Insert: {
          achievement_level?: string
          achievement_type?: string | null
          badge_icon?: string
          description?: string | null
          id?: string
          requirement_value?: number | null
          title: string
        }
        Update: {
          achievement_level?: string
          achievement_type?: string | null
          badge_icon?: string
          description?: string | null
          id?: string
          requirement_value?: number | null
          title?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience_type: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          market_id: string | null
          message: string
          store_id: string | null
          title: string
        }
        Insert: {
          audience_type?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          market_id?: string | null
          message: string
          store_id?: string | null
          title: string
        }
        Update: {
          audience_type?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          market_id?: string | null
          message?: string
          store_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          market_id: string | null
          store_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          market_id?: string | null
          store_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          market_id?: string | null
          store_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          id: string
          joined_at: string
          participation_status: string
          store_id: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          joined_at?: string
          participation_status?: string
          store_id?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          joined_at?: string
          participation_status?: string
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_stores: {
        Row: {
          challenge_id: string
          id: string
          store_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          store_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_stores_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          allow_late_joining: boolean
          challenge_level: Database["public"]["Enums"]["challenge_level"]
          challenge_type: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          image_url: string | null
          manual_entries_require_approval: boolean
          market_id: string
          maximum_daily_steps: number
          personal_step_goal: number
          reward_description: string | null
          reward_title: string | null
          rules: string | null
          scoring_method: Database["public"]["Enums"]["scoring_method"]
          start_date: string
          status: string
          store_step_goal: number
          title: string
          updated_at: string
          winner_announcement_date: string | null
        }
        Insert: {
          allow_late_joining?: boolean
          challenge_level?: Database["public"]["Enums"]["challenge_level"]
          challenge_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          image_url?: string | null
          manual_entries_require_approval?: boolean
          market_id: string
          maximum_daily_steps?: number
          personal_step_goal?: number
          reward_description?: string | null
          reward_title?: string | null
          rules?: string | null
          scoring_method?: Database["public"]["Enums"]["scoring_method"]
          start_date: string
          status?: string
          store_step_goal?: number
          title: string
          updated_at?: string
          winner_announcement_date?: string | null
        }
        Update: {
          allow_late_joining?: boolean
          challenge_level?: Database["public"]["Enums"]["challenge_level"]
          challenge_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          manual_entries_require_approval?: boolean
          market_id?: string
          maximum_daily_steps?: number
          personal_step_goal?: number
          reward_description?: string | null
          reward_title?: string | null
          rules?: string | null
          scoring_method?: Database["public"]["Enums"]["scoring_method"]
          start_date?: string
          status?: string
          store_step_goal?: number
          title?: string
          updated_at?: string
          winner_announcement_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_store_assignments: {
        Row: {
          created_at: string
          id: string
          permission_level: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_level?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_level?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_store_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          market_code: string
          market_name: string
          region: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          market_code: string
          market_name: string
          region?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          market_code?: string
          market_name?: string
          region?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          notification_type: string
          related_entity_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type?: string
          related_entity_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type?: string
          related_entity_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          daily_goal: number
          full_name: string
          id: string
          job_title: string | null
          market_id: string | null
          participates_in_challenges: boolean
          role: Database["public"]["Enums"]["app_role"]
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          daily_goal?: number
          full_name?: string
          id?: string
          job_title?: string | null
          market_id?: string | null
          participates_in_challenges?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          daily_goal?: number
          full_name?: string
          id?: string
          job_title?: string | null
          market_id?: string | null
          participates_in_challenges?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          target_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          target_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          target_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      step_entries: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          challenge_id: string | null
          created_at: string
          entry_date: string
          entry_method: Database["public"]["Enums"]["entry_method"]
          id: string
          proof_url: string | null
          rejection_reason: string | null
          step_count: number
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          challenge_id?: string | null
          created_at?: string
          entry_date: string
          entry_method?: Database["public"]["Enums"]["entry_method"]
          id?: string
          proof_url?: string | null
          rejection_reason?: string | null
          step_count: number
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          challenge_id?: string | null
          created_at?: string
          entry_date?: string
          entry_method?: Database["public"]["Enums"]["entry_method"]
          id?: string
          proof_url?: string | null
          rejection_reason?: string | null
          step_count?: number
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_achievements: {
        Row: {
          achievement_id: string
          challenge_id: string | null
          earned_at: string
          id: string
          store_id: string
        }
        Insert: {
          achievement_id: string
          challenge_id?: string | null
          earned_at?: string
          id?: string
          store_id: string
        }
        Update: {
          achievement_id?: string
          challenge_id?: string | null
          earned_at?: string
          id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_achievements_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_achievements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          city: string | null
          created_at: string
          id: string
          invitation_code: string
          is_active: boolean
          market_id: string
          province: string | null
          store_image_url: string | null
          store_name: string
          store_number: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          invitation_code: string
          is_active?: boolean
          market_id: string
          province?: string | null
          store_image_url?: string | null
          store_name: string
          store_number: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          invitation_code?: string
          is_active?: boolean
          market_id?: string
          province?: string | null
          store_image_url?: string | null
          store_name?: string
          store_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          challenge_id: string | null
          earned_at: string
          id: string
          store_id: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          challenge_id?: string | null
          earned_at?: string
          id?: string
          store_id?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          challenge_id?: string | null
          earned_at?: string
          id?: string
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_store: {
        Args: {
          _city?: string
          _province?: string
          _store_name: string
          _store_number: string
        }
        Returns: {
          id: string
          invitation_code: string
        }[]
      }
      admin_delete_store: { Args: { _store_id: string }; Returns: undefined }
      admin_set_member_access: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _store_id?: string
          _user_id: string
        }
        Returns: undefined
      }
      can_manage_store: { Args: { _store_id: string }; Returns: boolean }
      current_market_id: { Args: never; Returns: string }
      current_store_id: { Args: never; Returns: string }
      get_store_invitation_code: {
        Args: { _store_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager: { Args: never; Returns: boolean }
      join_store_with_code: {
        Args: { _code: string; _full_name?: string; _job_title?: string }
        Returns: {
          store_id: string
          store_name: string
        }[]
      }
    }
    Enums: {
      app_role: "crew" | "manager" | "general_manager" | "market_admin"
      approval_status: "approved" | "pending" | "rejected"
      challenge_level: "store" | "market"
      entry_method:
        | "manual"
        | "apple_health"
        | "google_health_connect"
        | "fitbit"
      scoring_method:
        | "total_steps"
        | "avg_per_active_participant"
        | "participation_rate"
        | "goal_completion_rate"
        | "avg_daily_steps"
        | "most_improved"
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
    Enums: {
      app_role: ["crew", "manager", "general_manager", "market_admin"],
      approval_status: ["approved", "pending", "rejected"],
      challenge_level: ["store", "market"],
      entry_method: [
        "manual",
        "apple_health",
        "google_health_connect",
        "fitbit",
      ],
      scoring_method: [
        "total_steps",
        "avg_per_active_participant",
        "participation_rate",
        "goal_completion_rate",
        "avg_daily_steps",
        "most_improved",
      ],
    },
  },
} as const
