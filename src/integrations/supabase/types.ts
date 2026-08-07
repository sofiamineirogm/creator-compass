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
      brand_profiles: {
        Row: {
          company_name: string
          created_at: string
          description: string | null
          id: string
          industry: string | null
          is_verified: boolean
          location: string | null
          logo_url: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          company_name?: string
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean
          location?: string | null
          logo_url?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean
          location?: string | null
          logo_url?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      campaign_applications: {
        Row: {
          attachments: Json
          availability: string | null
          brand_note: string | null
          campaign_id: string
          cover_message: string
          created_at: string
          creator_profile_id: string | null
          creator_user_id: string
          currency: string
          id: string
          is_invitation: boolean
          portfolio_examples: Json
          proposed_price: number
          responded_at: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          attachments?: Json
          availability?: string | null
          brand_note?: string | null
          campaign_id: string
          cover_message?: string
          created_at?: string
          creator_profile_id?: string | null
          creator_user_id: string
          currency?: string
          id?: string
          is_invitation?: boolean
          portfolio_examples?: Json
          proposed_price?: number
          responded_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          attachments?: Json
          availability?: string | null
          brand_note?: string | null
          campaign_id?: string
          cover_message?: string
          created_at?: string
          creator_profile_id?: string | null
          creator_user_id?: string
          currency?: string
          id?: string
          is_invitation?: boolean
          portfolio_examples?: Json
          proposed_price?: number
          responded_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_applications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_applications_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          applicants_count: number
          application_deadline: string | null
          audience_requirements: string | null
          brand_profile_id: string | null
          brand_user_id: string
          budget_max: number
          budget_min: number
          category: string | null
          created_at: string
          creator_categories: string[]
          creators_needed: number
          currency: string
          deliverables: string[]
          description: string
          ends_at: string | null
          expected_content: string | null
          id: string
          languages: string[]
          location: string | null
          location_type: Database["public"]["Enums"]["campaign_location_type"]
          max_followers: number | null
          min_engagement_rate: number
          min_followers: number
          objectives: string[]
          payment_model: Database["public"]["Enums"]["payment_model"]
          platforms: string[]
          starts_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          target_audience: string | null
          title: string
          updated_at: string
        }
        Insert: {
          applicants_count?: number
          application_deadline?: string | null
          audience_requirements?: string | null
          brand_profile_id?: string | null
          brand_user_id: string
          budget_max?: number
          budget_min?: number
          category?: string | null
          created_at?: string
          creator_categories?: string[]
          creators_needed?: number
          currency?: string
          deliverables?: string[]
          description?: string
          ends_at?: string | null
          expected_content?: string | null
          id?: string
          languages?: string[]
          location?: string | null
          location_type?: Database["public"]["Enums"]["campaign_location_type"]
          max_followers?: number | null
          min_engagement_rate?: number
          min_followers?: number
          objectives?: string[]
          payment_model?: Database["public"]["Enums"]["payment_model"]
          platforms?: string[]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_audience?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          applicants_count?: number
          application_deadline?: string | null
          audience_requirements?: string | null
          brand_profile_id?: string | null
          brand_user_id?: string
          budget_max?: number
          budget_min?: number
          category?: string | null
          created_at?: string
          creator_categories?: string[]
          creators_needed?: number
          currency?: string
          deliverables?: string[]
          description?: string
          ends_at?: string | null
          expected_content?: string | null
          id?: string
          languages?: string[]
          location?: string | null
          location_type?: Database["public"]["Enums"]["campaign_location_type"]
          max_followers?: number | null
          min_engagement_rate?: number
          min_followers?: number
          objectives?: string[]
          payment_model?: Database["public"]["Enums"]["payment_model"]
          platforms?: string[]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_audience?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_profile_id_fkey"
            columns: ["brand_profile_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          application_id: string | null
          brand_user_id: string
          campaign_id: string | null
          created_at: string
          creator_user_id: string
          id: string
          last_message_at: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          brand_user_id: string
          campaign_id?: string | null
          created_at?: string
          creator_user_id: string
          id?: string
          last_message_at?: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          brand_user_id?: string
          campaign_id?: string | null
          created_at?: string
          creator_user_id?: string
          id?: string
          last_message_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "campaign_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
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
      creator_profiles: {
        Row: {
          availability: string
          avatar_url: string | null
          bio: string | null
          categories: string[]
          created_at: string
          currency: string
          display_name: string
          handle: string | null
          headline: string | null
          id: string
          instagram_username: string | null
          is_boosted: boolean
          is_published: boolean
          is_verified: boolean
          languages: string[]
          location: string | null
          max_price: number | null
          past_collaborations: Json
          portfolio: Json
          starting_price: number
          tiktok_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string
          avatar_url?: string | null
          bio?: string | null
          categories?: string[]
          created_at?: string
          currency?: string
          display_name?: string
          handle?: string | null
          headline?: string | null
          id?: string
          instagram_username?: string | null
          is_boosted?: boolean
          is_published?: boolean
          is_verified?: boolean
          languages?: string[]
          location?: string | null
          max_price?: number | null
          past_collaborations?: Json
          portfolio?: Json
          starting_price?: number
          tiktok_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string
          avatar_url?: string | null
          bio?: string | null
          categories?: string[]
          created_at?: string
          currency?: string
          display_name?: string
          handle?: string | null
          headline?: string | null
          id?: string
          instagram_username?: string | null
          is_boosted?: boolean
          is_published?: boolean
          is_verified?: boolean
          languages?: string[]
          location?: string | null
          max_price?: number | null
          past_collaborations?: Json
          portfolio?: Json
          starting_price?: number
          tiktok_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      messages: {
        Row: {
          attachments: Json
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_user_id: string
        }
        Insert: {
          attachments?: Json
          body?: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_user_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
      saved_campaigns: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_campaigns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
      social_accounts: {
        Row: {
          connected_at: string
          connection_type: Database["public"]["Enums"]["social_connection_type"]
          created_at: string
          creator_profile_id: string
          handle: string
          id: string
          last_synced_at: string | null
          platform: Database["public"]["Enums"]["platform"]
          platform_user_id: string | null
          profile_url: string | null
          updated_at: string
        }
        Insert: {
          connected_at?: string
          connection_type?: Database["public"]["Enums"]["social_connection_type"]
          created_at?: string
          creator_profile_id: string
          handle: string
          id?: string
          last_synced_at?: string | null
          platform: Database["public"]["Enums"]["platform"]
          platform_user_id?: string | null
          profile_url?: string | null
          updated_at?: string
        }
        Update: {
          connected_at?: string
          connection_type?: Database["public"]["Enums"]["social_connection_type"]
          created_at?: string
          creator_profile_id?: string
          handle?: string
          id?: string
          last_synced_at?: string | null
          platform?: Database["public"]["Enums"]["platform"]
          platform_user_id?: string | null
          profile_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_creator_profile_id_fkey"
            columns: ["creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_profile_cache: {
        Row: {
          analytics_data: Json | null
          created_at: string
          expires_at: string | null
          fetch_error: string | null
          fetch_status: Database["public"]["Enums"]["cache_fetch_status"]
          id: string
          last_fetched_at: string | null
          locked_at: string | null
          platform: Database["public"]["Enums"]["platform"]
          profile_data: Json | null
          profile_url: string | null
          updated_at: string
          username: string
        }
        Insert: {
          analytics_data?: Json | null
          created_at?: string
          expires_at?: string | null
          fetch_error?: string | null
          fetch_status?: Database["public"]["Enums"]["cache_fetch_status"]
          id?: string
          last_fetched_at?: string | null
          locked_at?: string | null
          platform: Database["public"]["Enums"]["platform"]
          profile_data?: Json | null
          profile_url?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          analytics_data?: Json | null
          created_at?: string
          expires_at?: string | null
          fetch_error?: string | null
          fetch_status?: Database["public"]["Enums"]["cache_fetch_status"]
          id?: string
          last_fetched_at?: string | null
          locked_at?: string | null
          platform?: Database["public"]["Enums"]["platform"]
          profile_data?: Json | null
          profile_url?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
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
      in_conversation: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      owns_campaign: {
        Args: { _campaign_id: string; _user_id: string }
        Returns: boolean
      }
      owns_creator_profile: {
        Args: { _profile_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "guest" | "creator" | "brand" | "agency" | "admin"
      application_status:
        | "applied"
        | "shortlisted"
        | "negotiation"
        | "accepted"
        | "rejected"
        | "completed"
        | "withdrawn"
      cache_fetch_status: "pending" | "success" | "error"
      campaign_location_type: "remote" | "in_person" | "hybrid"
      campaign_status: "draft" | "open" | "closed" | "completed" | "archived"
      payment_model:
        | "fixed"
        | "per_deliverable"
        | "per_post"
        | "gifted"
        | "commission"
        | "hybrid"
      plan_tier:
        | "free"
        | "creator"
        | "creator_pro"
        | "agency"
        | "enterprise"
        | "brand"
      platform: "instagram" | "tiktok"
      social_connection_type: "public_handle" | "oauth"
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
      application_status: [
        "applied",
        "shortlisted",
        "negotiation",
        "accepted",
        "rejected",
        "completed",
        "withdrawn",
      ],
      cache_fetch_status: ["pending", "success", "error"],
      campaign_location_type: ["remote", "in_person", "hybrid"],
      campaign_status: ["draft", "open", "closed", "completed", "archived"],
      payment_model: [
        "fixed",
        "per_deliverable",
        "per_post",
        "gifted",
        "commission",
        "hybrid",
      ],
      plan_tier: [
        "free",
        "creator",
        "creator_pro",
        "agency",
        "enterprise",
        "brand",
      ],
      platform: ["instagram", "tiktok"],
      social_connection_type: ["public_handle", "oauth"],
    },
  },
} as const
