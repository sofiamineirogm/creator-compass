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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      benchmarks: {
        Row: {
          avg_engagement_rate: number
          avg_overall_score: number
          category: string | null
          country: string | null
          follower_bucket: string | null
          id: string
          p75_engagement_rate: number
          p90_engagement_rate: number
          platform: Database["public"]["Enums"]["platform"]
          sample_size: number
          updated_at: string
        }
        Insert: {
          avg_engagement_rate?: number
          avg_overall_score?: number
          category?: string | null
          country?: string | null
          follower_bucket?: string | null
          id?: string
          p75_engagement_rate?: number
          p90_engagement_rate?: number
          platform: Database["public"]["Enums"]["platform"]
          sample_size?: number
          updated_at?: string
        }
        Update: {
          avg_engagement_rate?: number
          avg_overall_score?: number
          category?: string | null
          country?: string | null
          follower_bucket?: string | null
          id?: string
          p75_engagement_rate?: number
          p90_engagement_rate?: number
          platform?: Database["public"]["Enums"]["platform"]
          sample_size?: number
          updated_at?: string
        }
        Relationships: []
      }
      creator_posts: {
        Row: {
          caption: string | null
          comments: number
          created_at: string
          creator_id: string
          external_id: string
          id: string
          likes: number
          posted_at: string | null
          thumbnail_url: string | null
          url: string | null
          views: number
        }
        Insert: {
          caption?: string | null
          comments?: number
          created_at?: string
          creator_id: string
          external_id: string
          id?: string
          likes?: number
          posted_at?: string | null
          thumbnail_url?: string | null
          url?: string | null
          views?: number
        }
        Update: {
          caption?: string | null
          comments?: number
          created_at?: string
          creator_id?: string
          external_id?: string
          id?: string
          likes?: number
          posted_at?: string | null
          thumbnail_url?: string | null
          url?: string | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          avatar_url: string | null
          avg_comments: number
          avg_likes: number
          avg_views: number
          biography: string | null
          category: string | null
          country: string | null
          created_at: string
          engagement_rate: number
          external_links: Json
          followers: number
          following: number
          full_name: string | null
          id: string
          is_private: boolean
          is_verified: boolean
          last_fetched_at: string
          platform: Database["public"]["Enums"]["platform"]
          posts_count: number
          profile_url: string | null
          raw: Json | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          avg_comments?: number
          avg_likes?: number
          avg_views?: number
          biography?: string | null
          category?: string | null
          country?: string | null
          created_at?: string
          engagement_rate?: number
          external_links?: Json
          followers?: number
          following?: number
          full_name?: string | null
          id?: string
          is_private?: boolean
          is_verified?: boolean
          last_fetched_at?: string
          platform: Database["public"]["Enums"]["platform"]
          posts_count?: number
          profile_url?: string | null
          raw?: Json | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          avg_comments?: number
          avg_likes?: number
          avg_views?: number
          biography?: string | null
          category?: string | null
          country?: string | null
          created_at?: string
          engagement_rate?: number
          external_links?: Json
          followers?: number
          following?: number
          full_name?: string | null
          id?: string
          is_private?: boolean
          is_verified?: boolean
          last_fetched_at?: string
          platform?: Database["public"]["Enums"]["platform"]
          posts_count?: number
          profile_url?: string | null
          raw?: Json | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          accessibility_score: number
          brand_score: number
          created_at: string
          creator_id: string
          engagement_score: number
          growth_score: number
          id: string
          overall_score: number
          premium: Json | null
          summaries: Json
          user_id: string | null
        }
        Insert: {
          accessibility_score?: number
          brand_score?: number
          created_at?: string
          creator_id: string
          engagement_score?: number
          growth_score?: number
          id?: string
          overall_score?: number
          premium?: Json | null
          summaries?: Json
          user_id?: string | null
        }
        Update: {
          accessibility_score?: number
          brand_score?: number
          created_at?: string
          creator_id?: string
          engagement_score?: number
          growth_score?: number
          id?: string
          overall_score?: number
          premium?: Json | null
          summaries?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_creators: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_creators_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string
          creator_id: string | null
          id: string
          platform: Database["public"]["Enums"]["platform"]
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string
          creator_id?: string | null
          id?: string
          platform: Database["public"]["Enums"]["platform"]
          user_id?: string | null
          username: string
        }
        Update: {
          created_at?: string
          creator_id?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["platform"]
          user_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_history_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: Database["public"]["Enums"]["plan_tier"]
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "guest" | "creator" | "brand" | "agency" | "admin"
      plan_tier: "free" | "creator" | "creator_pro" | "agency" | "enterprise"
      platform: "instagram" | "tiktok"
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
      app_role: ["guest", "creator", "brand", "agency", "admin"],
      plan_tier: ["free", "creator", "creator_pro", "agency", "enterprise"],
      platform: ["instagram", "tiktok"],
    },
  },
} as const
