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
      connection_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invite_code: string
          invitee_email: string | null
          invitee_user_id: string | null
          inviter_user_id: string
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          status: Database["public"]["Enums"]["invite_status"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          invitee_email?: string | null
          invitee_user_id?: string | null
          inviter_user_id: string
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          invitee_email?: string | null
          invitee_user_id?: string | null
          inviter_user_id?: string
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "connection_invites_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_invites_inviter_user_id_fkey"
            columns: ["inviter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string
          id: string
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          user_a_id: string
          user_b_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_members: {
        Row: {
          created_at: string
          goal_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_members_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_shares: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          owner_user_id: string
          shared_with_user_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          owner_user_id: string
          shared_with_user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          owner_user_id?: string
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_shares_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_shares_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_supporters: {
        Row: {
          created_at: string
          goal_id: string
          supporter_user_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          supporter_user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          supporter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_supporters_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_supporters_supporter_user_id_fkey"
            columns: ["supporter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      together_interactions: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          interaction_key: string
          interaction_type: Database["public"]["Enums"]["together_interaction_type"]
          recipient_user_id: string
          seen_at: string | null
          sender_user_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          interaction_key: string
          interaction_type: Database["public"]["Enums"]["together_interaction_type"]
          recipient_user_id: string
          seen_at?: string | null
          sender_user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          interaction_key?: string
          interaction_type?: Database["public"]["Enums"]["together_interaction_type"]
          recipient_user_id?: string
          seen_at?: string | null
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "together_interactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "together_interactions_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "together_interactions_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string
          collaboration_mode: Database["public"]["Enums"]["collaboration_mode"]
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          due_at: string | null
          due_has_time: boolean
          id: string
          owner_user_id: string
          status: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          collaboration_mode?: Database["public"]["Enums"]["collaboration_mode"]
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          due_at?: string | null
          due_has_time?: boolean
          id?: string
          owner_user_id: string
          status?: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          collaboration_mode?: Database["public"]["Enums"]["collaboration_mode"]
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          due_at?: string | null
          due_has_time?: boolean
          id?: string
          owner_user_id?: string
          status?: Database["public"]["Enums"]["goal_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      microtasks: {
        Row: {
          assigned_to_user_id: string | null
          completed: boolean
          created_at: string
          goal_id: string
          id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          completed?: boolean
          created_at?: string
          goal_id: string
          id?: string
          position: number
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          completed?: boolean
          created_at?: string
          goal_id?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "microtasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microtasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          onboarding_completed: boolean
          onboarding_intent: string | null
          onboarding_step: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          onboarding_completed?: boolean
          onboarding_intent?: string | null
          onboarding_step?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          onboarding_completed?: boolean
          onboarding_intent?: string | null
          onboarding_step?: string
          updated_at?: string
        }
        Relationships: []
      }
      voice_goal_commits: {
        Row: {
          commit_key: string
          created_at: string
          goal_ids: string[]
          user_id: string
        }
        Insert: {
          commit_key: string
          created_at?: string
          goal_ids: string[]
          user_id: string
        }
        Update: {
          commit_key?: string
          created_at?: string
          goal_ids?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_goal_commits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_connection_invite: {
        Args: { target_invite_code: string }
        Returns: {
          created_at: string
          id: string
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          user_a_id: string
          user_b_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "connections"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_connection_invite: {
        Args: {
          target_email: string
          target_relationship: Database["public"]["Enums"]["relationship_type"]
        }
        Returns: {
          accepted_at: string | null
          created_at: string
          id: string
          invite_code: string
          invitee_email: string | null
          invitee_user_id: string | null
          inviter_user_id: string
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          status: Database["public"]["Enums"]["invite_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "connection_invites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_voice_goals: {
        Args: { p_commit_key: string; p_proposals: Json }
        Returns: {
          category: string
          collaboration_mode: Database["public"]["Enums"]["collaboration_mode"]
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          due_at: string | null
          due_has_time: boolean
          id: string
          owner_user_id: string
          status: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "goals"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      decline_connection_invite: {
        Args: { target_invite_id: string }
        Returns: undefined
      }
      remove_connection: {
        Args: { target_connection_id: string }
        Returns: undefined
      }
      request_connection_invite: {
        Args: {
          target_email: string
          target_relationship: Database["public"]["Enums"]["relationship_type"]
        }
        Returns: Json
      }
      mark_together_interactions_seen: {
        Args: { target_goal_id: string }
        Returns: undefined
      }
      send_together_interaction: {
        Args: {
          target_goal_id: string
          target_key: string
          target_type: Database["public"]["Enums"]["together_interaction_type"]
        }
        Returns: Json
      }
      share_goal: {
        Args: { target_goal_id: string; target_user_id: string }
        Returns: {
          created_at: string
          goal_id: string
          id: string
          owner_user_id: string
          shared_with_user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "goal_shares"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      unshare_goal: {
        Args: { target_goal_id: string; target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      collaboration_mode: "private" | "supported" | "shared"
      goal_status: "active" | "completed" | "deleted"
      invite_status: "pending" | "accepted" | "cancelled" | "expired"
      relationship_type: "partner" | "friend" | "family" | "parent" | "child"
      together_interaction_type: "encouragement" | "reaction" | "check_in" | "nudge"
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
      collaboration_mode: ["private", "supported", "shared"],
      goal_status: ["active", "completed", "deleted"],
      invite_status: ["pending", "accepted", "cancelled", "expired"],
      relationship_type: ["partner", "friend", "family", "parent", "child"],
      together_interaction_type: ["encouragement", "reaction", "check_in", "nudge"],
    },
  },
} as const
