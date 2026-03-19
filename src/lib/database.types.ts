export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      expense_balance_events: {
        Row: {
          amount_cents: number
          created_at: string
          event_kind: string
          expense_id: string | null
          from_profile_id: string
          household_id: string
          id: string
          to_profile_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          event_kind: string
          expense_id?: string | null
          from_profile_id: string
          household_id: string
          id?: string
          to_profile_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          event_kind?: string
          expense_id?: string | null
          from_profile_id?: string
          household_id?: string
          id?: string
          to_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_balance_events_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_balance_events_from_profile_id_fkey"
            columns: ["from_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_balance_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_balance_events_to_profile_id_fkey"
            columns: ["to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          key: string
          name_en: string
          name_es: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon: string
          id?: string
          key: string
          name_en: string
          name_es: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          key?: string
          name_en?: string
          name_es?: string
          sort_order?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_cents: number
          category_id: string
          created_at: string
          created_by_profile_id: string
          description: string | null
          expense_date: string
          household_id: string
          id: string
          paid_by_profile_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          category_id: string
          created_at?: string
          created_by_profile_id: string
          description?: string | null
          expense_date?: string
          household_id: string
          id?: string
          paid_by_profile_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          category_id?: string
          created_at?: string
          created_by_profile_id?: string
          description?: string | null
          expense_date?: string
          household_id?: string
          id?: string
          paid_by_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_profile_id_fkey"
            columns: ["paid_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          expires_at: string
          household_id: string
          id: string
          invite_code: string
          invited_email: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          expires_at?: string
          household_id: string
          id?: string
          invite_code: string
          invited_email?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          household_id?: string
          id?: string
          invite_code?: string
          invited_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          profile_id: string
          role: string
        }
        Insert: {
          created_at?: string
          household_id: string
          profile_id: string
          role?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      kudos: {
        Row: {
          created_at: string
          from_profile: string
          household_id: string
          id: string
          message: string | null
          points: number
          to_profile: string
        }
        Insert: {
          created_at?: string
          from_profile: string
          household_id: string
          id?: string
          message?: string | null
          points?: number
          to_profile: string
        }
        Update: {
          created_at?: string
          from_profile?: string
          household_id?: string
          id?: string
          message?: string | null
          points?: number
          to_profile?: string
        }
        Relationships: [
          {
            foreignKeyName: "kudos_from_profile_fkey"
            columns: ["from_profile"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_to_profile_fkey"
            columns: ["to_profile"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      love_notes: {
        Row: {
          content: string
          created_at: string
          from_profile: string
          household_id: string
          id: string
          task_id: string | null
          to_profile: string
        }
        Insert: {
          content: string
          created_at?: string
          from_profile: string
          household_id: string
          id?: string
          task_id?: string | null
          to_profile: string
        }
        Update: {
          content?: string
          created_at?: string
          from_profile?: string
          household_id?: string
          id?: string
          task_id?: string | null
          to_profile?: string
        }
        Relationships: [
          {
            foreignKeyName: "love_notes_from_profile_fkey"
            columns: ["from_profile"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "love_notes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "love_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "love_notes_to_profile_fkey"
            columns: ["to_profile"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          id: string
          name: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      settlements: {
        Row: {
          amount_cents: number
          created_at: string
          created_by_profile_id: string
          household_id: string
          id: string
          note: string | null
          paid_by_profile_id: string
          paid_to_profile_id: string
          settled_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by_profile_id: string
          household_id: string
          id?: string
          note?: string | null
          paid_by_profile_id: string
          paid_to_profile_id: string
          settled_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by_profile_id?: string
          household_id?: string
          id?: string
          note?: string | null
          paid_by_profile_id?: string
          paid_to_profile_id?: string
          settled_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_paid_by_profile_id_fkey"
            columns: ["paid_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_paid_to_profile_id_fkey"
            columns: ["paid_to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_items: {
        Row: {
          added_by: string | null
          created_at: string
          household_id: string
          id: string
          is_purchased: boolean
          name: string
          quantity: number
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          household_id: string
          id?: string
          is_purchased?: boolean
          name: string
          quantity?: number
        }
        Update: {
          added_by?: string | null
          created_at?: string
          household_id?: string
          id?: string
          is_purchased?: boolean
          name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      task_catalog: {
        Row: {
          category: string
          created_at: string
          default_effort_level: string
          default_points: number
          default_time_of_day: string | null
          icon: string
          id: string
          key: string
          name_en: string
          name_es: string
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          default_effort_level: string
          default_points: number
          default_time_of_day?: string | null
          icon: string
          id?: string
          key: string
          name_en: string
          name_es: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          default_effort_level?: string
          default_points?: number
          default_time_of_day?: string | null
          icon?: string
          id?: string
          key?: string
          name_en?: string
          name_es?: string
          sort_order?: number
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          completed_at: string
          completed_by: string
          household_id: string
          id: string
          points_earned: number
          task_id: string
        }
        Insert: {
          completed_at?: string
          completed_by: string
          household_id: string
          id?: string
          points_earned?: number
          task_id: string
        }
        Update: {
          completed_at?: string
          completed_by?: string
          household_id?: string
          id?: string
          points_earned?: number
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          assignment_type: string
          catalog_task_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          date: string | null
          deleted_at: string | null
          description: string | null
          effort_level: string | null
          end_time: string | null
          frequency: string | null
          household_id: string
          id: string
          is_recurring: boolean
          last_done_by: string | null
          location: string | null
          points: number
          priority: string
          recurrence_id: string | null
          start_time: string | null
          status: string
          time_of_day: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assignment_type?: string
          catalog_task_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          deleted_at?: string | null
          description?: string | null
          effort_level?: string | null
          end_time?: string | null
          frequency?: string | null
          household_id: string
          id?: string
          is_recurring?: boolean
          last_done_by?: string | null
          location?: string | null
          points?: number
          priority?: string
          recurrence_id?: string | null
          start_time?: string | null
          status?: string
          time_of_day?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assignment_type?: string
          catalog_task_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          deleted_at?: string | null
          description?: string | null
          effort_level?: string | null
          end_time?: string | null
          frequency?: string | null
          household_id?: string
          id?: string
          is_recurring?: boolean
          last_done_by?: string | null
          location?: string | null
          points?: number
          priority?: string
          recurrence_id?: string | null
          start_time?: string | null
          status?: string
          time_of_day?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_catalog_task_id_fkey"
            columns: ["catalog_task_id"]
            isOneToOne: false
            referencedRelation: "task_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_last_done_by_fkey"
            columns: ["last_done_by"]
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
      accept_household_invite: {
        Args: { p_invite_code: string }
        Returns: Json
      }
      calc_shared_half_cents: {
        Args: { p_amount_cents: number }
        Returns: number
      }
      create_household_and_invite: { Args: never; Returns: Json }
      current_balance_cents_since_last_settlement: {
        Args: { p_household_id: string; p_profile_id: string }
        Returns: number
      }
      current_profile_id: { Args: never; Returns: string }
      delete_task_series_rpc: {
        Args: { p_from_date?: string; p_recurrence_id: string }
        Returns: undefined
      }
      delete_tasks_after_rpc: {
        Args: { p_date: string; p_recurrence_id: string }
        Returns: undefined
      }
      f_unaccent: { Args: { value: string }; Returns: string }
      get_counterparty_profile: {
        Args: { p_household_id: string; p_profile_id: string }
        Returns: string
      }
      get_invite_info: { Args: { p_invite_code: string }; Returns: Json }
      is_household_member: {
        Args: { p_household_id: string }
        Returns: boolean
      }
      link_profile_to_auth_user: { Args: never; Returns: string }
      profile_in_household: {
        Args: { p_household_id: string; p_profile_id: string }
        Returns: boolean
      }
      search_expenses: {
        Args: {
          p_category_id?: string
          p_from_date?: string
          p_household_id: string
          p_paid_by_profile_id?: string
          p_search_term: string
          p_to_date?: string
        }
        Returns: {
          amount_cents: number
          category_id: string
          created_at: string
          created_by_profile_id: string
          description: string | null
          expense_date: string
          household_id: string
          id: string
          paid_by_profile_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "expenses"
          isOneToOne: false
          isSetofReturn: true
        }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

