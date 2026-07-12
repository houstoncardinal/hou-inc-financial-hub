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
      portfolio_projects: {
        Row: {
          id: string
          title: string
          category: string
          location: string
          sqft: string | null
          year: string
          description: string | null
          featured: boolean
          cover_url: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          category?: string
          location?: string
          sqft?: string | null
          year?: string
          description?: string | null
          featured?: boolean
          cover_url?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          category?: string
          location?: string
          sqft?: string | null
          year?: string
          description?: string | null
          featured?: boolean
          cover_url?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_media: {
        Row: {
          id: string
          project_id: string
          url: string
          storage_path: string
          media_type: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          url: string
          storage_path: string
          media_type: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          url?: string
          storage_path?: string
          media_type?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projects"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_log: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["audit_event"]
          geo_city: string | null
          geo_country: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          success: boolean
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["audit_event"]
          geo_city?: string | null
          geo_country?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          success?: boolean
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["audit_event"]
          geo_city?: string | null
          geo_country?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          success?: boolean
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      checks: {
        Row: {
          amount: number
          check_number: string
          created_at: string
          deleted_at: string | null
          entity_id: string
          id: string
          issue_date: string
          lien_waiver_status: string
          memo: string | null
          payee_name: string
          payee_vendor_id: string | null
          project_id: string | null
          reconciled: boolean
          reconciled_at: string | null
          retainage_held: number
          retainage_pct: number
          status: Database["public"]["Enums"]["check_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          check_number: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          issue_date?: string
          lien_waiver_status?: string
          memo?: string | null
          payee_name: string
          payee_vendor_id?: string | null
          project_id?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          retainage_held?: number
          retainage_pct?: number
          status?: Database["public"]["Enums"]["check_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          check_number?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          issue_date?: string
          lien_waiver_status?: string
          memo?: string | null
          payee_name?: string
          payee_vendor_id?: string | null
          project_id?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          retainage_held?: number
          retainage_pct?: number
          status?: Database["public"]["Enums"]["check_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checks_payee_vendor_id_fkey"
            columns: ["payee_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_project_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_vendor_fk"
            columns: ["payee_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number
          code: string | null
          created_at: string
          deleted_at: string | null
          entity_id: string
          id: string
          name: string
          notes: string | null
          portal_brief_id: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          name: string
          notes?: string | null
          portal_brief_id?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          name?: string
          notes?: string | null
          portal_brief_id?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          cost_type: string | null
          created_at: string
          deleted_at: string | null
          entity_id: string
          id: string
          notes: string | null
          payment_method: string | null
          project_id: string | null
          reconciled: boolean
          reconciled_at: string | null
          source_name: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["txn_type"]
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          cost_type?: string | null
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          project_id?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          source_name?: string | null
          transaction_date?: string
          type: Database["public"]["Enums"]["txn_type"]
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          cost_type?: string | null
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          project_id?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          source_name?: string | null
          transaction_date?: string
          type?: Database["public"]["Enums"]["txn_type"]
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "txn_project_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "txn_vendor_fk"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_clients: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          password_hash: string | null
          project_type: string
          project_interest: string | null
          status: string
          created_at: string
          updated_at: string
          approved_at: string | null
          rejected_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string
          password_hash?: string | null
          project_type?: string
          project_interest?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          rejected_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          password_hash?: string | null
          project_type?: string
          project_interest?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          rejected_at?: string | null
        }
        Relationships: []
      }
      portal_briefs: {
        Row: {
          id: string
          client_id: string
          type: string | null
          location: string | null
          sqft: string | null
          bedrooms: string | null
          bathrooms: string | null
          floors: string | null
          style: string[] | null
          budget: string | null
          timeline: string | null
          description: string | null
          status: string
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          type?: string | null
          location?: string | null
          sqft?: string | null
          bedrooms?: string | null
          bathrooms?: string | null
          floors?: string | null
          style?: string[] | null
          budget?: string | null
          timeline?: string | null
          description?: string | null
          status?: string
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          type?: string | null
          location?: string | null
          sqft?: string | null
          bedrooms?: string | null
          bathrooms?: string | null
          floors?: string | null
          style?: string[] | null
          budget?: string | null
          timeline?: string | null
          description?: string | null
          status?: string
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      portal_messages: {
        Row: {
          id: string
          client_id: string
          sender: string
          sender_name: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          sender: string
          sender_name: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          sender?: string
          sender_name?: string
          body?: string
          created_at?: string
        }
        Relationships: []
      }
      portal_documents: {
        Row: {
          id: string
          client_id: string
          name: string
          file_type: string
          file_size: string | null
          category: string
          status: string
          requested_by: string | null
          description: string | null
          uploaded_at: string | null
          created_at: string
          storage_path: string | null
          file_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          file_type?: string
          file_size?: string | null
          category?: string
          status?: string
          requested_by?: string | null
          description?: string | null
          uploaded_at?: string | null
          created_at?: string
          storage_path?: string | null
          file_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          name?: string
          file_type?: string
          file_size?: string | null
          category?: string
          status?: string
          requested_by?: string | null
          description?: string | null
          uploaded_at?: string | null
          created_at?: string
          storage_path?: string | null
          file_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: []
      }
      portal_meetings: {
        Row: {
          id: string
          client_id: string
          type: string
          date: string
          time: string
          format: string
          notes: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          type: string
          date: string
          time: string
          format?: string
          notes?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          type?: string
          date?: string
          time?: string
          format?: string
          notes?: string | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      portal_admin_notes: {
        Row: {
          id: string
          client_id: string
          body: string
          author: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          body: string
          author?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          body?: string
          author?: string | null
          created_at?: string
        }
        Relationships: []
      }
      change_orders: {
        Row: {
          id: string
          client_id: string
          number: string | null
          description: string
          amount: number
          status: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          number?: string | null
          description: string
          amount: number
          status?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          number?: string | null
          description?: string
          amount?: number
          status?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          id: string
          created_at: string
          name: string
          email: string
          phone: string | null
          company: string | null
          service_type: string | null
          budget_range: string | null
          message: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email: string
          phone?: string | null
          company?: string | null
          service_type?: string | null
          budget_range?: string | null
          message?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string
          phone?: string | null
          company?: string | null
          service_type?: string | null
          budget_range?: string | null
          message?: string | null
        }
        Relationships: []
      }
      start_project_submissions: {
        Row: {
          id: string
          created_at: string
          submitted_at: string
          name: string | null
          email: string | null
          phone: string | null
          type: string | null
          scope: string | null
          sqft: string | null
          location: string | null
          budget: string | null
          start_timeline: string | null
          priorities: string[] | null
          description: string | null
          status: string | null
          admin_notes: string | null
          assigned_to: string | null
          updated_at: string | null
          last_contacted_at: string | null
          next_follow_up_at: string | null
          estimated_value: number | null
          converted_to_client_id: string | null
          tags: string[] | null
        }
        Insert: {
          id?: string
          created_at?: string
          submitted_at?: string
          name?: string | null
          email?: string | null
          phone?: string | null
          type?: string | null
          scope?: string | null
          sqft?: string | null
          location?: string | null
          budget?: string | null
          start_timeline?: string | null
          priorities?: string[] | null
          description?: string | null
          status?: string | null
          admin_notes?: string | null
          assigned_to?: string | null
          updated_at?: string | null
          last_contacted_at?: string | null
          next_follow_up_at?: string | null
          estimated_value?: number | null
          converted_to_client_id?: string | null
          tags?: string[] | null
        }
        Update: {
          id?: string
          created_at?: string
          submitted_at?: string
          name?: string | null
          email?: string | null
          phone?: string | null
          type?: string | null
          scope?: string | null
          sqft?: string | null
          location?: string | null
          budget?: string | null
          start_timeline?: string | null
          priorities?: string[] | null
          description?: string | null
          status?: string | null
          admin_notes?: string | null
          assigned_to?: string | null
          updated_at?: string | null
          last_contacted_at?: string | null
          next_follow_up_at?: string | null
          estimated_value?: number | null
          converted_to_client_id?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          deleted_at: string | null
          ein: string | null
          entity_id: string
          id: string
          lien_waiver_required: boolean
          name: string
          notes: string | null
          requires_1099: boolean
          updated_at: string
          user_id: string
          w9_on_file: boolean
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          ein?: string | null
          entity_id?: string
          id?: string
          lien_waiver_required?: boolean
          name: string
          notes?: string | null
          requires_1099?: boolean
          updated_at?: string
          user_id: string
          w9_on_file?: boolean
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          ein?: string | null
          entity_id?: string
          id?: string
          lien_waiver_required?: boolean
          name?: string
          notes?: string | null
          requires_1099?: boolean
          updated_at?: string
          user_id?: string
          w9_on_file?: boolean
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client_address: string
          client_company: string
          client_email: string
          client_name: string
          created_at: string
          due_date: string
          entity_id: string
          id: string
          issue_date: string
          line_items: Json
          notes: string
          portal_client_id: string | null
          status: string
          stripe_payment_link: string | null
          tax_rate: number
          terms: string
          invoice_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_address?: string
          client_company?: string
          client_email?: string
          client_name?: string
          created_at?: string
          due_date?: string
          entity_id?: string
          id?: string
          issue_date?: string
          line_items?: Json
          notes?: string
          portal_client_id?: string | null
          status?: string
          stripe_payment_link?: string | null
          tax_rate?: number
          terms?: string
          invoice_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_address?: string
          client_company?: string
          client_email?: string
          client_name?: string
          created_at?: string
          due_date?: string
          entity_id?: string
          id?: string
          issue_date?: string
          line_items?: Json
          notes?: string
          portal_client_id?: string | null
          status?: string
          stripe_payment_link?: string | null
          tax_rate?: number
          terms?: string
          invoice_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_portal_client_id_fkey"
            columns: ["portal_client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          }
        ]
      }
      documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          doc_type: string
          entity_id: string
          extracted_data: Json
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          linked_check_id: string | null
          linked_invoice_id: string | null
          linked_transaction_id: string | null
          ocr_error: string | null
          ocr_status: string
          tags: string[]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          doc_type?: string
          entity_id?: string
          extracted_data?: Json
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          linked_check_id?: string | null
          linked_invoice_id?: string | null
          linked_transaction_id?: string | null
          ocr_error?: string | null
          ocr_status?: string
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          doc_type?: string
          entity_id?: string
          extracted_data?: Json
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          linked_check_id?: string | null
          linked_invoice_id?: string | null
          linked_transaction_id?: string | null
          ocr_error?: string | null
          ocr_status?: string
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_linked_check_id_fkey"
            columns: ["linked_check_id"]
            isOneToOne: false
            referencedRelation: "checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          }
        ]
      }
      draw_schedules: {
        Row: {
          created_at: string
          draw_amount: number
          id: string
          milestone_name: string
          notes: string | null
          project_id: string
          scheduled_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draw_amount?: number
          id?: string
          milestone_name: string
          notes?: string | null
          project_id: string
          scheduled_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draw_amount?: number
          id?: string
          milestone_name?: string
          notes?: string | null
          project_id?: string
          scheduled_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      audit_event:
        | "login_success"
        | "login_failure"
        | "logout"
        | "signup"
        | "check_issued"
        | "check_voided"
        | "check_updated"
        | "transaction_created"
        | "transaction_updated"
        | "transaction_deleted"
        | "project_created"
        | "project_updated"
        | "project_deleted"
        | "vendor_created"
        | "vendor_updated"
        | "vendor_deleted"
        | "export_drive"
        | "export_csv"
        | "export_pdf"
      check_status: "pending" | "cleared" | "voided"
      project_status: "active" | "on_hold" | "completed" | "archived"
      txn_type: "income" | "expense"
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
      audit_event: [
        "login_success",
        "login_failure",
        "logout",
        "signup",
        "check_issued",
        "check_voided",
        "check_updated",
        "transaction_created",
        "transaction_updated",
        "transaction_deleted",
        "project_created",
        "project_updated",
        "project_deleted",
        "vendor_created",
        "vendor_updated",
        "vendor_deleted",
        "export_drive",
        "export_csv",
        "export_pdf",
      ],
      check_status: ["pending", "cleared", "voided"],
      project_status: ["active", "on_hold", "completed", "archived"],
      txn_type: ["income", "expense"],
    },
  },
} as const
