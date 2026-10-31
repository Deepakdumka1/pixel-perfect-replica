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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_change_log: {
        Row: {
          applied_at: string
          description: string
          id: string
        }
        Insert: {
          applied_at?: string
          description: string
          id?: string
        }
        Update: {
          applied_at?: string
          description?: string
          id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          chaos_mode: boolean
          elements: Json
          id: string
          updated_at: string
          version_label: string
        }
        Insert: {
          chaos_mode?: boolean
          elements?: Json
          id?: string
          updated_at?: string
          version_label?: string
        }
        Update: {
          chaos_mode?: boolean
          elements?: Json
          id?: string
          updated_at?: string
          version_label?: string
        }
        Relationships: []
      }
      jira_comments: {
        Row: {
          author: string
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author?: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      run_results: {
        Row: {
          attempts: Json
          duration_ms: number
          id: string
          repair_log: Json
          run_id: string
          status: string
          test_id: string | null
          test_name: string
          visual: Json | null
        }
        Insert: {
          attempts?: Json
          duration_ms?: number
          id?: string
          repair_log?: Json
          run_id: string
          status: string
          test_id?: string | null
          test_name: string
          visual?: Json | null
        }
        Update: {
          attempts?: Json
          duration_ms?: number
          id?: string
          repair_log?: Json
          run_id?: string
          status?: string
          test_id?: string | null
          test_name?: string
          visual?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "run_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          app_version: string
          failed: number
          finished_at: string | null
          flaky_count: number
          id: string
          mode: string
          passed: number
          repaired: number
          started_at: string
          status: string
          ticket_id: string
          total_tests: number
        }
        Insert: {
          app_version?: string
          failed?: number
          finished_at?: string | null
          flaky_count?: number
          id?: string
          mode?: string
          passed?: number
          repaired?: number
          started_at?: string
          status?: string
          ticket_id: string
          total_tests?: number
        }
        Update: {
          app_version?: string
          failed?: number
          finished_at?: string | null
          flaky_count?: number
          id?: string
          mode?: string
          passed?: number
          repaired?: number
          started_at?: string
          status?: string
          ticket_id?: string
          total_tests?: number
        }
        Relationships: [
          {
            foreignKeyName: "runs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string
          generated_by: string
          id: string
          name: string
          steps: Json
          ticket_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          generated_by?: string
          id?: string
          name: string
          steps?: Json
          ticket_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          generated_by?: string
          id?: string
          name?: string
          steps?: Json
          ticket_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tests_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          acceptance_criteria: Json
          created_at: string
          description: string
          id: string
          jira_status: string
          key: string
          priority: string
          title: string
        }
        Insert: {
          acceptance_criteria?: Json
          created_at?: string
          description?: string
          id?: string
          jira_status?: string
          key: string
          priority?: string
          title: string
        }
        Update: {
          acceptance_criteria?: Json
          created_at?: string
          description?: string
          id?: string
          jira_status?: string
          key?: string
          priority?: string
          title?: string
        }
        Relationships: []
      }
      visual_baselines: {
        Row: {
          fingerprint: Json
          screenshot: string
          test_name: string
          updated_at: string
        }
        Insert: {
          fingerprint?: Json
          screenshot: string
          test_name: string
          updated_at?: string
        }
        Update: {
          fingerprint?: Json
          screenshot?: string
          test_name?: string
          updated_at?: string
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
