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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      feed_comments: {
        Row: {
          content: string
          created_at: string
          entry_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          entry_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          entry_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_likes: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_likes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          id: string
          market_pair: string | null
          mood: string | null
          notes: string | null
          pnl_pips: number | null
          result: string | null
          session: string | null
          share_setting: string | null
          tags: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          market_pair?: string | null
          mood?: string | null
          notes?: string | null
          pnl_pips?: number | null
          result?: string | null
          session?: string | null
          share_setting?: string | null
          tags?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          market_pair?: string | null
          mood?: string | null
          notes?: string | null
          pnl_pips?: number | null
          result?: string | null
          session?: string | null
          share_setting?: string | null
          tags?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          connection_id: string | null
          content: string
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          connection_id?: string | null
          content: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          connection_id?: string | null
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string
          body: string | null
          comment_id: string | null
          created_at: string
          entry_id: string | null
          id: string
          read: boolean
          related_user_id: string | null
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          body?: string | null
          comment_id?: string | null
          created_at?: string
          entry_id?: string | null
          id?: string
          read?: boolean
          related_user_id?: string | null
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          body?: string | null
          comment_id?: string | null
          created_at?: string
          entry_id?: string | null
          id?: string
          read?: boolean
          related_user_id?: string | null
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "feed_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_connections: {
        Row: {
          created_at: string
          id: string
          match_breakdown: Json | null
          match_score: number | null
          receiver_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_breakdown?: Json | null
          match_score?: number | null
          receiver_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_breakdown?: Json | null
          match_score?: number | null
          receiver_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          chart_prompts: string[] | null
          created_at: string | null
          full_name: string | null
          gender: string | null
          hobbies: string[] | null
          id: string
          location: string | null
          off_chart_prompts: string[] | null
          onboarding_completed: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          chart_prompts?: string[] | null
          created_at?: string | null
          full_name?: string | null
          gender?: string | null
          hobbies?: string[] | null
          id: string
          location?: string | null
          off_chart_prompts?: string[] | null
          onboarding_completed?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          chart_prompts?: string[] | null
          created_at?: string | null
          full_name?: string | null
          gender?: string | null
          hobbies?: string[] | null
          id?: string
          location?: string | null
          off_chart_prompts?: string[] | null
          onboarding_completed?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      trading_profiles: {
        Row: {
          connect_frequency: string[] | null
          connection_reach: string | null
          connection_types: string[] | null
          created_at: string | null
          experience_level: string | null
          frequency: string[] | null
          id: string
          journaling: string[] | null
          looking_for_gender: string | null
          loss_response: string | null
          markets: string[] | null
          match_priorities: string[] | null
          primary_goal: string[] | null
          sessions: string[] | null
          strategies: string[] | null
          struggles: string[] | null
          timeframes: string[] | null
          trade_times: string[] | null
          trading_plan: string[] | null
          trading_style: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          connect_frequency?: string[] | null
          connection_reach?: string | null
          connection_types?: string[] | null
          created_at?: string | null
          experience_level?: string | null
          frequency?: string[] | null
          id?: string
          journaling?: string[] | null
          looking_for_gender?: string | null
          loss_response?: string | null
          markets?: string[] | null
          match_priorities?: string[] | null
          primary_goal?: string[] | null
          sessions?: string[] | null
          strategies?: string[] | null
          struggles?: string[] | null
          timeframes?: string[] | null
          trade_times?: string[] | null
          trading_plan?: string[] | null
          trading_style?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          connect_frequency?: string[] | null
          connection_reach?: string | null
          connection_types?: string[] | null
          created_at?: string | null
          experience_level?: string | null
          frequency?: string[] | null
          id?: string
          journaling?: string[] | null
          looking_for_gender?: string | null
          loss_response?: string | null
          markets?: string[] | null
          match_priorities?: string[] | null
          primary_goal?: string[] | null
          sessions?: string[] | null
          strategies?: string[] | null
          struggles?: string[] | null
          timeframes?: string[] | null
          trade_times?: string[] | null
          trading_plan?: string[] | null
          trading_style?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          market: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          market: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          market?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
