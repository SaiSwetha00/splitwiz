// Hand-authored types for all Phase 2–4 tables.
// Replace with `supabase gen types typescript` output once a project is connected.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // ── Phase 2 ──────────────────────────────────────────────
      trips: {
        Row: {
          id: string;
          code: string;
          name: string;
          currency: string;
          created_at: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          currency?: string;
          created_at?: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          currency?: string;
          created_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          trip_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          trip_id: string;
          paid_by_id: string;
          description: string;
          amount_cents: number;
          category: string | null;
          category_id: string | null;
          split_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          paid_by_id: string;
          description: string;
          amount_cents: number;
          category?: string | null;
          category_id?: string | null;
          split_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          paid_by_id?: string;
          description?: string;
          amount_cents?: number;
          category?: string | null;
          category_id?: string | null;
          split_type?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_paid_by_id_fkey";
            columns: ["paid_by_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_shares: {
        Row: {
          id: string;
          expense_id: string;
          member_id: string;
          amount_cents: number;
        };
        Insert: {
          id?: string;
          expense_id: string;
          member_id: string;
          amount_cents: number;
        };
        Update: {
          id?: string;
          expense_id?: string;
          member_id?: string;
          amount_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "expense_shares_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_shares_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      // ── Phase 3 ──────────────────────────────────────────────
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // ── Phase 4 ──────────────────────────────────────────────
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          icon: string | null;
          color: string | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          icon?: string | null;
          color?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          icon?: string | null;
          color?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          id: string;
          default_currency: string;
          notifications_enabled: boolean;
          theme: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          default_currency?: string;
          notifications_enabled?: boolean;
          theme?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          default_currency?: string;
          notifications_enabled?: boolean;
          theme?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          name: string;
          amount_cents: number;
          period: string;
          start_date: string;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          name: string;
          amount_cents: number;
          period?: string;
          start_date: string;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          name?: string;
          amount_cents?: number;
          period?: string;
          start_date?: string;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budgets_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string | null;
          target_cents: number;
          current_cents: number;
          deadline: string | null;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string | null;
          target_cents: number;
          current_cents?: number;
          deadline?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string | null;
          target_cents?: number;
          current_cents?: number;
          deadline?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          amount_cents: number;
          currency: string;
          billing_cycle: string;
          next_billing_date: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          amount_cents: number;
          currency?: string;
          billing_cycle?: string;
          next_billing_date?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          name?: string;
          description?: string | null;
          amount_cents?: number;
          currency?: string;
          billing_cycle?: string;
          next_billing_date?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          action_url: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          action_url?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          action_url?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          id: string;
          expense_id: string;
          uploaded_by: string | null;
          storage_path: string;
          file_name: string | null;
          file_size: number | null;
          mime_type: string | null;
          ocr_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          uploaded_by?: string | null;
          storage_path: string;
          file_name?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          ocr_text?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          expense_id?: string;
          uploaded_by?: string | null;
          storage_path?: string;
          file_name?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          ocr_text?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "receipts_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_insights: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          content: Json;
          generated_at: string;
          expires_at: string | null;
          dismissed: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          content?: Json;
          generated_at?: string;
          expires_at?: string | null;
          dismissed?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          content?: Json;
          generated_at?: string;
          expires_at?: string | null;
          dismissed?: boolean;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string | null;
          trip_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          trip_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          trip_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      expense_tags: {
        Row: {
          expense_id: string;
          tag_id: string;
        };
        Insert: {
          expense_id: string;
          tag_id: string;
        };
        Update: {
          expense_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_tags_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      recurring_expenses: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string | null;
          category_id: string | null;
          description: string;
          amount_cents: number;
          split_type: string;
          frequency: string;
          next_date: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trip_id?: string | null;
          category_id?: string | null;
          description: string;
          amount_cents: number;
          split_type?: string;
          frequency: string;
          next_date: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trip_id?: string | null;
          category_id?: string | null;
          description?: string;
          amount_cents?: number;
          split_type?: string;
          frequency?: string;
          next_date?: string;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_expenses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_collaborators: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          role: string;
          invited_by: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          user_id: string;
          role?: string;
          invited_by?: string | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          user_id?: string;
          role?: string;
          invited_by?: string | null;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_collaborators_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      lookup_user_by_email: {
        Args: { p_email: string };
        Returns: string | null;
      };
      update_expense_with_shares: {
        Args: {
          p_expense_id: string;
          p_description: string;
          p_amount_cents: number;
          p_category: string | null;
          p_paid_by_id: string;
          p_split_type: string;
          p_shares: Json;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
