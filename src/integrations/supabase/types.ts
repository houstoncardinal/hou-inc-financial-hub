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
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          entity_id: string
          id: string
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          period_key: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          entity_id?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          period_key: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          entity_id?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          period_key?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_changelog: {
        Row: {
          action: string
          changed_by: string
          created_at: string
          dashboard: string
          details: Json | null
          entity: string
          entity_id: string | null
          entity_label: string | null
          id: string
        }
        Insert: {
          action: string
          changed_by?: string
          created_at?: string
          dashboard: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          entity_label?: string | null
          id?: string
        }
        Update: {
          action?: string
          changed_by?: string
          created_at?: string
          dashboard?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          entity_label?: string | null
          id?: string
        }
        Relationships: []
      }
      admin_help_requests: {
        Row: {
          category: string
          created_at: string
          entity_id: string | null
          id: string
          message: string
          page_path: string | null
          page_title: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          screenshot_path: string | null
          status: string
          updated_at: string
          user_email: string
          user_id: string
          user_name: string | null
          user_role: string | null
          viewport: Json | null
        }
        Insert: {
          category?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          message: string
          page_path?: string | null
          page_title?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_path?: string | null
          status?: string
          updated_at?: string
          user_email: string
          user_id: string
          user_name?: string | null
          user_role?: string | null
          viewport?: Json | null
        }
        Update: {
          category?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          message?: string
          page_path?: string | null
          page_title?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_path?: string | null
          status?: string
          updated_at?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
          user_role?: string | null
          viewport?: Json | null
        }
        Relationships: []
      }
      admin_project_milestones: {
        Row: {
          completed_date: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_client_visible: boolean
          project_id: string
          sort_order: number
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_client_visible?: boolean
          project_id: string
          sort_order?: number
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_client_visible?: boolean
          project_id?: string
          sort_order?: number
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "admin_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_project_updates: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          is_client_visible: boolean
          pinned: boolean
          project_id: string
          title: string
          update_type: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string
          id?: string
          is_client_visible?: boolean
          pinned?: boolean
          project_id: string
          title: string
          update_type?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          is_client_visible?: boolean
          pinned?: boolean
          project_id?: string
          title?: string
          update_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "admin_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_projects: {
        Row: {
          actual_completion: string | null
          address: string | null
          admin_user_id: string
          architect: string | null
          budget: number | null
          city: string
          client_email: string | null
          client_name: string | null
          contract_amount: number | null
          created_at: string
          custom_fields: Json | null
          deleted_at: string | null
          description: string | null
          entity: string
          estimated_completion: string | null
          finance_project_id: string | null
          id: string
          internal_notes: string | null
          latitude: number | null
          longitude: number | null
          portal_client_id: string | null
          progress_pct: number
          project_code: string | null
          project_manager: string | null
          start_date: string | null
          state: string
          status: string
          superintendent: string | null
          title: string
          type: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          actual_completion?: string | null
          address?: string | null
          admin_user_id: string
          architect?: string | null
          budget?: number | null
          city?: string
          client_email?: string | null
          client_name?: string | null
          contract_amount?: number | null
          created_at?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          description?: string | null
          entity?: string
          estimated_completion?: string | null
          finance_project_id?: string | null
          id?: string
          internal_notes?: string | null
          latitude?: number | null
          longitude?: number | null
          portal_client_id?: string | null
          progress_pct?: number
          project_code?: string | null
          project_manager?: string | null
          start_date?: string | null
          state?: string
          status?: string
          superintendent?: string | null
          title: string
          type?: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          actual_completion?: string | null
          address?: string | null
          admin_user_id?: string
          architect?: string | null
          budget?: number | null
          city?: string
          client_email?: string | null
          client_name?: string | null
          contract_amount?: number | null
          created_at?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          description?: string | null
          entity?: string
          estimated_completion?: string | null
          finance_project_id?: string | null
          id?: string
          internal_notes?: string | null
          latitude?: number | null
          longitude?: number | null
          portal_client_id?: string | null
          progress_pct?: number
          project_code?: string | null
          project_manager?: string | null
          start_date?: string | null
          state?: string
          status?: string
          superintendent?: string | null
          title?: string
          type?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_projects_finance_project_id_fkey"
            columns: ["finance_project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "admin_projects_finance_project_id_fkey"
            columns: ["finance_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_projects_portal_client_id_fkey"
            columns: ["portal_client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      app_user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          entity_id: string
          id: string
          is_active: boolean
          notes: string | null
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          entity_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          role: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          entity_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["audit_event"]
          geo_city: string | null
          geo_country: string | null
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      change_orders: {
        Row: {
          amount: number
          client_id: string
          client_note: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          number: string | null
          project_id: string | null
          reviewed_at: string | null
          status: string
        }
        Insert: {
          amount: number
          client_id: string
          client_note?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          number?: string | null
          project_id?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          client_id?: string
          client_note?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          number?: string | null
          project_id?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      checks: {
        Row: {
          amount: number
          amount_in_words: string | null
          approval_status: string
          attachment_count: number
          bank_account_id: string | null
          change_order_id: string | null
          check_number: string
          cleared_date: string | null
          construction_division_id: string | null
          cost_code_id: string | null
          created_at: string
          deleted_at: string | null
          delivery_status: string
          due_date: string | null
          entity_id: string
          external_reference: string | null
          id: string
          issue_date: string
          lien_waiver_status: string
          memo: string | null
          milestone_id: string | null
          original_check_id: string | null
          paid_at: string | null
          payee_name: string
          payee_vendor_id: string | null
          posting_date: string | null
          print_status: string
          project_id: string | null
          project_phase_id: string | null
          reconciled: boolean
          reconciled_at: string | null
          reconciliation_status: string
          replacement_check_id: string | null
          retainage_held: number | null
          retainage_pct: number | null
          scope_item_id: string | null
          status: Database["public"]["Enums"]["check_status"]
          tags: string[]
          updated_at: string
          user_id: string
          void_date: string | null
          void_reason: string | null
        }
        Insert: {
          amount: number
          amount_in_words?: string | null
          approval_status?: string
          attachment_count?: number
          bank_account_id?: string | null
          change_order_id?: string | null
          check_number: string
          cleared_date?: string | null
          construction_division_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          deleted_at?: string | null
          delivery_status?: string
          due_date?: string | null
          entity_id?: string
          external_reference?: string | null
          id?: string
          issue_date?: string
          lien_waiver_status?: string
          memo?: string | null
          milestone_id?: string | null
          original_check_id?: string | null
          paid_at?: string | null
          payee_name: string
          payee_vendor_id?: string | null
          posting_date?: string | null
          print_status?: string
          project_id?: string | null
          project_phase_id?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          reconciliation_status?: string
          replacement_check_id?: string | null
          retainage_held?: number | null
          retainage_pct?: number | null
          scope_item_id?: string | null
          status?: Database["public"]["Enums"]["check_status"]
          tags?: string[]
          updated_at?: string
          user_id: string
          void_date?: string | null
          void_reason?: string | null
        }
        Update: {
          amount?: number
          amount_in_words?: string | null
          approval_status?: string
          attachment_count?: number
          bank_account_id?: string | null
          change_order_id?: string | null
          check_number?: string
          cleared_date?: string | null
          construction_division_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          deleted_at?: string | null
          delivery_status?: string
          due_date?: string | null
          entity_id?: string
          external_reference?: string | null
          id?: string
          issue_date?: string
          lien_waiver_status?: string
          memo?: string | null
          milestone_id?: string | null
          original_check_id?: string | null
          paid_at?: string | null
          payee_name?: string
          payee_vendor_id?: string | null
          posting_date?: string | null
          print_status?: string
          project_id?: string | null
          project_phase_id?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          reconciliation_status?: string
          replacement_check_id?: string | null
          retainage_held?: number | null
          retainage_pct?: number | null
          scope_item_id?: string | null
          status?: Database["public"]["Enums"]["check_status"]
          tags?: string[]
          updated_at?: string
          user_id?: string
          void_date?: string | null
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checks_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "finance_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "project_change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_construction_division_id_fkey"
            columns: ["construction_division_id"]
            isOneToOne: false
            referencedRelation: "finance_construction_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "finance_cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_original_check_id_fkey"
            columns: ["original_check_id"]
            isOneToOne: false
            referencedRelation: "checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_payee_vendor_id_fkey"
            columns: ["payee_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "checks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_project_phase_id_fkey"
            columns: ["project_phase_id"]
            isOneToOne: false
            referencedRelation: "finance_project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_replacement_check_id_fkey"
            columns: ["replacement_check_id"]
            isOneToOne: false
            referencedRelation: "checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checks_scope_item_id_fkey"
            columns: ["scope_item_id"]
            isOneToOne: false
            referencedRelation: "project_scope_items"
            referencedColumns: ["id"]
          },
        ]
      }
      company_accounting_settings: {
        Row: {
          accounting_method: string
          created_at: string
          default_accounts_payable_id: string | null
          default_accounts_receivable_id: string | null
          default_bank_account_id: string | null
          default_currency: string
          default_customer_deposit_id: string | null
          default_income_account_id: string | null
          default_processing_fee_id: string | null
          default_retainage_payable_id: string | null
          default_retainage_receivable_id: string | null
          default_sales_tax_account_id: string | null
          default_undeposited_funds_id: string | null
          entity_id: string
          fiscal_year_start_month: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accounting_method?: string
          created_at?: string
          default_accounts_payable_id?: string | null
          default_accounts_receivable_id?: string | null
          default_bank_account_id?: string | null
          default_currency?: string
          default_customer_deposit_id?: string | null
          default_income_account_id?: string | null
          default_processing_fee_id?: string | null
          default_retainage_payable_id?: string | null
          default_retainage_receivable_id?: string | null
          default_sales_tax_account_id?: string | null
          default_undeposited_funds_id?: string | null
          entity_id?: string
          fiscal_year_start_month?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accounting_method?: string
          created_at?: string
          default_accounts_payable_id?: string | null
          default_accounts_receivable_id?: string | null
          default_bank_account_id?: string | null
          default_currency?: string
          default_customer_deposit_id?: string | null
          default_income_account_id?: string | null
          default_processing_fee_id?: string | null
          default_retainage_payable_id?: string | null
          default_retainage_receivable_id?: string | null
          default_sales_tax_account_id?: string | null
          default_undeposited_funds_id?: string | null
          entity_id?: string
          fiscal_year_start_month?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_accounting_settings_default_accounts_payable_id_fkey"
            columns: ["default_accounts_payable_id"]
            isOneToOne: false
            referencedRelation: "finance_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_accounting_settings_default_accounts_receivable_id_fkey"
            columns: ["default_accounts_receivable_id"]
            isOneToOne: false
            referencedRelation: "finance_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_accounting_settings_default_bank_account_id_fkey"
            columns: ["default_bank_account_id"]
            isOneToOne: false
            referencedRelation: "finance_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_accounting_settings_default_customer_deposit_id_fkey"
            columns: ["default_customer_deposit_id"]
            isOneToOne: false
            referencedRelation: "finance_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_accounting_settings_default_income_account_id_fkey"
            columns: ["default_income_account_id"]
            isOneToOne: false
            referencedRelation: "finance_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_accounting_settings_default_processing_fee_id_fkey"
            columns: ["default_processing_fee_id"]
            isOneToOne: false
            referencedRelation: "finance_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_accounting_settings_default_retainage_payable_id_fkey"
            columns: ["default_retainage_payable_id"]
            isOneToOne: false
            referencedRelation: "finance_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_accounting_settings_default_retainage_receivable_i_fkey"
            columns: ["default_retainage_receivable_id"]
            isOneToOne: false
            referencedRelation: "finance_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_accounting_settings_default_sales_tax_account_id_fkey"
            columns: ["default_sales_tax_account_id"]
            isOneToOne: false
            referencedRelation: "finance_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_accounting_settings_default_undeposited_funds_id_fkey"
            columns: ["default_undeposited_funds_id"]
            isOneToOne: false
            referencedRelation: "finance_chart_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          budget_range: string | null
          company: string | null
          converted_admin_project_id: string | null
          created_at: string
          email: string
          id: string
          lead_status: string
          message: string
          name: string
          phone: string | null
          service_type: string | null
        }
        Insert: {
          budget_range?: string | null
          company?: string | null
          converted_admin_project_id?: string | null
          created_at?: string
          email: string
          id?: string
          lead_status?: string
          message: string
          name: string
          phone?: string | null
          service_type?: string | null
        }
        Update: {
          budget_range?: string | null
          company?: string | null
          converted_admin_project_id?: string | null
          created_at?: string
          email?: string
          id?: string
          lead_status?: string
          message?: string
          name?: string
          phone?: string | null
          service_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_submissions_converted_admin_project_id_fkey"
            columns: ["converted_admin_project_id"]
            isOneToOne: false
            referencedRelation: "admin_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archived_at: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          doc_type: string
          document_category: string | null
          entity_id: string
          extracted_data: Json
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          linked_check_id: string | null
          linked_invoice_id: string | null
          linked_project_id: string | null
          linked_transaction_id: string | null
          ocr_error: string | null
          ocr_status: string
          related_entity_id: string | null
          related_entity_type: string | null
          tags: string[]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          doc_type?: string
          document_category?: string | null
          entity_id?: string
          extracted_data?: Json
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          linked_check_id?: string | null
          linked_invoice_id?: string | null
          linked_project_id?: string | null
          linked_transaction_id?: string | null
          ocr_error?: string | null
          ocr_status?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          doc_type?: string
          document_category?: string | null
          entity_id?: string
          extracted_data?: Json
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          linked_check_id?: string | null
          linked_invoice_id?: string | null
          linked_project_id?: string | null
          linked_transaction_id?: string | null
          ocr_error?: string | null
          ocr_status?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          },
          {
            foreignKeyName: "documents_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_schedules: {
        Row: {
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          draw_amount: number
          id: string
          invoice_number: string | null
          milestone_name: string
          notes: string | null
          project_id: string
          scheduled_date: string | null
          status: string
        }
        Insert: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          draw_amount?: number
          id?: string
          invoice_number?: string | null
          milestone_name: string
          notes?: string | null
          project_id: string
          scheduled_date?: string | null
          status?: string
        }
        Update: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          draw_amount?: number
          id?: string
          invoice_number?: string | null
          milestone_name?: string
          notes?: string | null
          project_id?: string
          scheduled_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "draw_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_attachments: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          document_category: string | null
          entity_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          related_entity_id: string
          related_entity_type: string
          storage_bucket: string
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          document_category?: string | null
          entity_id?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          related_entity_id: string
          related_entity_type: string
          storage_bucket?: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          document_category?: string | null
          entity_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          related_entity_id?: string
          related_entity_type?: string
          storage_bucket?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_audit_events: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          entity_id: string
          entity_record_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          previous_values: Json | null
          reason: string | null
          session_metadata: Json | null
          source: string
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          entity_id?: string
          entity_record_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          previous_values?: Json | null
          reason?: string | null
          session_metadata?: Json | null
          source?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          entity_id?: string
          entity_record_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          previous_values?: Json | null
          reason?: string | null
          session_metadata?: Json | null
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      finance_bank_accounts: {
        Row: {
          account_name: string
          account_type: string
          bank_name: string | null
          created_at: string
          currency: string
          entity_id: string
          id: string
          is_active: boolean
          is_default: boolean
          masked_account: string | null
          opening_balance: number
          routing_ref: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_type?: string
          bank_name?: string | null
          created_at?: string
          currency?: string
          entity_id?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          masked_account?: string | null
          opening_balance?: number
          routing_ref?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_type?: string
          bank_name?: string | null
          created_at?: string
          currency?: string
          entity_id?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          masked_account?: string | null
          opening_balance?: number
          routing_ref?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_bank_activity: {
        Row: {
          activity_date: string
          amount: number
          bank_account_id: string | null
          counterparty: string | null
          created_at: string
          description: string | null
          entity_id: string
          id: string
          import_id: string | null
          match_status: string
          matched_source_id: string | null
          matched_source_table: string | null
          metadata: Json
          normalized_reference: string | null
          posted_date: string | null
          reference: string | null
          user_id: string
        }
        Insert: {
          activity_date: string
          amount: number
          bank_account_id?: string | null
          counterparty?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string
          id?: string
          import_id?: string | null
          match_status?: string
          matched_source_id?: string | null
          matched_source_table?: string | null
          metadata?: Json
          normalized_reference?: string | null
          posted_date?: string | null
          reference?: string | null
          user_id: string
        }
        Update: {
          activity_date?: string
          amount?: number
          bank_account_id?: string | null
          counterparty?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string
          id?: string
          import_id?: string | null
          match_status?: string
          matched_source_id?: string | null
          matched_source_table?: string | null
          metadata?: Json
          normalized_reference?: string | null
          posted_date?: string | null
          reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_bank_activity_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "finance_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_bank_activity_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "finance_bank_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_bank_imports: {
        Row: {
          bank_account_id: string | null
          entity_id: string
          file_name: string | null
          id: string
          imported_at: string
          metadata: Json
          row_count: number
          source: string
          status: string
          user_id: string
        }
        Insert: {
          bank_account_id?: string | null
          entity_id?: string
          file_name?: string | null
          id?: string
          imported_at?: string
          metadata?: Json
          row_count?: number
          source?: string
          status?: string
          user_id: string
        }
        Update: {
          bank_account_id?: string | null
          entity_id?: string
          file_name?: string | null
          id?: string
          imported_at?: string
          metadata?: Json
          row_count?: number
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_bank_imports_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "finance_bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_bank_match_suggestions: {
        Row: {
          amount_score: number
          bank_activity_id: string
          confidence: number
          counterparty_score: number
          created_at: string
          date_score: number
          entity_id: string
          id: string
          metadata: Json
          reference_score: number
          source_record_id: string
          source_table: string
          status: string
          user_id: string
        }
        Insert: {
          amount_score?: number
          bank_activity_id: string
          confidence: number
          counterparty_score?: number
          created_at?: string
          date_score?: number
          entity_id?: string
          id?: string
          metadata?: Json
          reference_score?: number
          source_record_id: string
          source_table: string
          status?: string
          user_id: string
        }
        Update: {
          amount_score?: number
          bank_activity_id?: string
          confidence?: number
          counterparty_score?: number
          created_at?: string
          date_score?: number
          entity_id?: string
          id?: string
          metadata?: Json
          reference_score?: number
          source_record_id?: string
          source_table?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_bank_match_suggestions_bank_activity_id_fkey"
            columns: ["bank_activity_id"]
            isOneToOne: false
            referencedRelation: "finance_bank_activity"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          created_at: string
          default_account_id: string | null
          description: string | null
          entity_id: string
          id: string
          is_active: boolean
          module: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_account_id?: string | null
          description?: string | null
          entity_id?: string
          id?: string
          is_active?: boolean
          module: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_account_id?: string | null
          description?: string | null
          entity_id?: string
          id?: string
          is_active?: boolean
          module?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_chart_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_subtype: string | null
          account_type: string
          allow_manual_posting: boolean
          created_at: string
          current_balance: number
          description: string | null
          entity_id: string
          id: string
          is_active: boolean
          is_system: boolean
          normal_balance: string
          parent_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          account_subtype?: string | null
          account_type: string
          allow_manual_posting?: boolean
          created_at?: string
          current_balance?: number
          description?: string | null
          entity_id?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          normal_balance: string
          parent_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          account_subtype?: string | null
          account_type?: string
          allow_manual_posting?: boolean
          created_at?: string
          current_balance?: number
          description?: string | null
          entity_id?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          normal_balance?: string
          parent_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_chart_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "finance_chart_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_check_allocations: {
        Row: {
          allocated_amount: number
          change_order_id: string | null
          check_id: string
          cost_code_id: string | null
          created_at: string
          discount_amount: number
          entity_id: string
          expense_transaction_id: string | null
          id: string
          milestone_id: string | null
          notes: string | null
          project_id: string | null
          retainage_amount: number
          sov_item_id: string | null
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          allocated_amount?: number
          change_order_id?: string | null
          check_id: string
          cost_code_id?: string | null
          created_at?: string
          discount_amount?: number
          entity_id?: string
          expense_transaction_id?: string | null
          id?: string
          milestone_id?: string | null
          notes?: string | null
          project_id?: string | null
          retainage_amount?: number
          sov_item_id?: string | null
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          allocated_amount?: number
          change_order_id?: string | null
          check_id?: string
          cost_code_id?: string | null
          created_at?: string
          discount_amount?: number
          entity_id?: string
          expense_transaction_id?: string | null
          id?: string
          milestone_id?: string | null
          notes?: string | null
          project_id?: string | null
          retainage_amount?: number
          sov_item_id?: string | null
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_check_allocations_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "project_change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_check_allocations_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_check_allocations_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "finance_cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_check_allocations_expense_transaction_id_fkey"
            columns: ["expense_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_check_allocations_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_check_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "finance_check_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_check_allocations_sov_item_id_fkey"
            columns: ["sov_item_id"]
            isOneToOne: false
            referencedRelation: "project_scope_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_check_allocations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_client_accounts: {
        Row: {
          billing_address: string | null
          city: string | null
          client_type: string
          company: string | null
          construction_scope: string | null
          county: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          entity_id: string
          fuel_type: string | null
          generator_model: string | null
          generator_serial: string | null
          hgp_equipment_unit_id: string | null
          hgp_service_agreement_id: string | null
          hgp_site_id: string | null
          id: string
          install_status: string | null
          kw_rating: number | null
          last_visit_date: string | null
          latitude: number | null
          lifetime_revenue: number
          longitude: number | null
          metadata: Json
          name: string
          next_visit_date: string | null
          notes: string | null
          open_balance: number
          phone: string | null
          preferred_contact_method: string | null
          project_id: string | null
          project_stage: string | null
          property_type: string | null
          secondary_phone: string | null
          site_address: string | null
          state: string
          status: string
          tags: string[]
          updated_at: string
          user_id: string
          utility_provider: string | null
          zip: string | null
        }
        Insert: {
          billing_address?: string | null
          city?: string | null
          client_type?: string
          company?: string | null
          construction_scope?: string | null
          county?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          entity_id: string
          fuel_type?: string | null
          generator_model?: string | null
          generator_serial?: string | null
          hgp_equipment_unit_id?: string | null
          hgp_service_agreement_id?: string | null
          hgp_site_id?: string | null
          id?: string
          install_status?: string | null
          kw_rating?: number | null
          last_visit_date?: string | null
          latitude?: number | null
          lifetime_revenue?: number
          longitude?: number | null
          metadata?: Json
          name: string
          next_visit_date?: string | null
          notes?: string | null
          open_balance?: number
          phone?: string | null
          preferred_contact_method?: string | null
          project_id?: string | null
          project_stage?: string | null
          property_type?: string | null
          secondary_phone?: string | null
          site_address?: string | null
          state?: string
          status?: string
          tags?: string[]
          updated_at?: string
          user_id: string
          utility_provider?: string | null
          zip?: string | null
        }
        Update: {
          billing_address?: string | null
          city?: string | null
          client_type?: string
          company?: string | null
          construction_scope?: string | null
          county?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          entity_id?: string
          fuel_type?: string | null
          generator_model?: string | null
          generator_serial?: string | null
          hgp_equipment_unit_id?: string | null
          hgp_service_agreement_id?: string | null
          hgp_site_id?: string | null
          id?: string
          install_status?: string | null
          kw_rating?: number | null
          last_visit_date?: string | null
          latitude?: number | null
          lifetime_revenue?: number
          longitude?: number | null
          metadata?: Json
          name?: string
          next_visit_date?: string | null
          notes?: string | null
          open_balance?: number
          phone?: string | null
          preferred_contact_method?: string | null
          project_id?: string | null
          project_stage?: string | null
          property_type?: string | null
          secondary_phone?: string | null
          site_address?: string | null
          state?: string
          status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          utility_provider?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_client_accounts_hgp_equipment_unit_id_fkey"
            columns: ["hgp_equipment_unit_id"]
            isOneToOne: false
            referencedRelation: "hgp_equipment_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_client_accounts_hgp_service_agreement_id_fkey"
            columns: ["hgp_service_agreement_id"]
            isOneToOne: false
            referencedRelation: "hgp_service_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_client_accounts_hgp_site_id_fkey"
            columns: ["hgp_site_id"]
            isOneToOne: false
            referencedRelation: "hgp_customer_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_client_accounts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "finance_client_accounts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_commitments: {
        Row: {
          approved_change_amount: number
          commitment_number: string | null
          commitment_type: string
          cost_code: string | null
          cost_phase: string | null
          created_at: string
          deleted_at: string | null
          end_date: string | null
          entity_id: string
          id: string
          invoiced_amount: number
          notes: string | null
          original_amount: number
          paid_amount: number
          project_id: string | null
          retainage_held: number
          retainage_percent: number
          revised_amount: number | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          approved_change_amount?: number
          commitment_number?: string | null
          commitment_type?: string
          cost_code?: string | null
          cost_phase?: string | null
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          entity_id?: string
          id?: string
          invoiced_amount?: number
          notes?: string | null
          original_amount?: number
          paid_amount?: number
          project_id?: string | null
          retainage_held?: number
          retainage_percent?: number
          revised_amount?: number | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          approved_change_amount?: number
          commitment_number?: string | null
          commitment_type?: string
          cost_code?: string | null
          cost_phase?: string | null
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          entity_id?: string
          id?: string
          invoiced_amount?: number
          notes?: string | null
          original_amount?: number
          paid_amount?: number
          project_id?: string | null
          retainage_held?: number
          retainage_percent?: number
          revised_amount?: number | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_commitments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "finance_commitments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_commitments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_construction_divisions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          entity_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          entity_id?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          entity_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_cost_codes: {
        Row: {
          code: string
          cost_type: string | null
          created_at: string
          description: string | null
          division_id: string | null
          entity_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          cost_type?: string | null
          created_at?: string
          description?: string | null
          division_id?: string | null
          entity_id?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          cost_type?: string | null
          created_at?: string
          description?: string | null
          division_id?: string | null
          entity_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_cost_codes_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "finance_construction_divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_journal_entries: {
        Row: {
          accounting_period: string
          created_at: string
          entity_id: string
          id: string
          is_adjusting_entry: boolean
          is_reversal: boolean
          journal_number: string
          memo: string | null
          posted_at: string | null
          posted_by: string | null
          posting_date: string
          reversal_entry_id: string | null
          source_module: string
          source_record_id: string
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accounting_period: string
          created_at?: string
          entity_id?: string
          id?: string
          is_adjusting_entry?: boolean
          is_reversal?: boolean
          journal_number: string
          memo?: string | null
          posted_at?: string | null
          posted_by?: string | null
          posting_date?: string
          reversal_entry_id?: string | null
          source_module: string
          source_record_id: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accounting_period?: string
          created_at?: string
          entity_id?: string
          id?: string
          is_adjusting_entry?: boolean
          is_reversal?: boolean
          journal_number?: string
          memo?: string | null
          posted_at?: string | null
          posted_by?: string | null
          posting_date?: string
          reversal_entry_id?: string | null
          source_module?: string
          source_record_id?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_journal_entries_reversal_entry_id_fkey"
            columns: ["reversal_entry_id"]
            isOneToOne: false
            referencedRelation: "finance_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_journal_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_journal_lines: {
        Row: {
          account_id: string
          client_id: string | null
          cost_code_id: string | null
          created_at: string
          credit: number
          debit: number
          department: string | null
          description: string | null
          division_id: string | null
          entity_id: string
          id: string
          journal_entry_id: string
          phase_id: string | null
          project_id: string | null
          sov_item_id: string | null
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          account_id: string
          client_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          department?: string | null
          description?: string | null
          division_id?: string | null
          entity_id?: string
          id?: string
          journal_entry_id: string
          phase_id?: string | null
          project_id?: string | null
          sov_item_id?: string | null
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          account_id?: string
          client_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          department?: string | null
          description?: string | null
          division_id?: string | null
          entity_id?: string
          id?: string
          journal_entry_id?: string
          phase_id?: string | null
          project_id?: string | null
          sov_item_id?: string | null
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_chart_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_journal_lines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_journal_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "finance_cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_journal_lines_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "finance_construction_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "finance_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_journal_lines_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "finance_project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_journal_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "finance_journal_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_journal_lines_sov_item_id_fkey"
            columns: ["sov_item_id"]
            isOneToOne: false
            referencedRelation: "project_scope_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_journal_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_project_phases: {
        Row: {
          code: string | null
          created_at: string
          end_date: string | null
          entity_id: string
          id: string
          name: string
          project_id: string | null
          sort_order: number
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          end_date?: string | null
          entity_id?: string
          id?: string
          name: string
          project_id?: string | null
          sort_order?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          end_date?: string | null
          entity_id?: string
          id?: string
          name?: string
          project_id?: string | null
          sort_order?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "finance_project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_reconciliation_audit: {
        Row: {
          action: string
          amount: number | null
          counterparty: string | null
          created_at: string
          entity_id: string
          id: string
          metadata: Json
          new_cleared_date: string | null
          new_reconciled: boolean | null
          new_status: string | null
          previous_cleared_date: string | null
          previous_reconciled: boolean | null
          previous_status: string | null
          project_id: string | null
          reference: string | null
          signature: string | null
          source_record_id: string
          source_table: string
          user_id: string | null
        }
        Insert: {
          action: string
          amount?: number | null
          counterparty?: string | null
          created_at?: string
          entity_id?: string
          id?: string
          metadata?: Json
          new_cleared_date?: string | null
          new_reconciled?: boolean | null
          new_status?: string | null
          previous_cleared_date?: string | null
          previous_reconciled?: boolean | null
          previous_status?: string | null
          project_id?: string | null
          reference?: string | null
          signature?: string | null
          source_record_id: string
          source_table: string
          user_id?: string | null
        }
        Update: {
          action?: string
          amount?: number | null
          counterparty?: string | null
          created_at?: string
          entity_id?: string
          id?: string
          metadata?: Json
          new_cleared_date?: string | null
          new_reconciled?: boolean | null
          new_status?: string | null
          previous_cleared_date?: string | null
          previous_reconciled?: boolean | null
          previous_status?: string | null
          project_id?: string | null
          reference?: string | null
          signature?: string | null
          source_record_id?: string
          source_table?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_reconciliation_audit_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "finance_reconciliation_audit_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_reports: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          period_end: string | null
          period_start: string | null
          report_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_type?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_transaction_allocations: {
        Row: {
          allocated_amount: number
          allocation_percentage: number | null
          allocation_type: string
          change_order_id: string | null
          cost_code_id: string | null
          created_at: string
          division_id: string | null
          entity_id: string
          id: string
          invoice_id: string | null
          markup_amount: number
          milestone_id: string | null
          notes: string | null
          phase_id: string | null
          project_id: string | null
          retainage_amount: number
          sov_item_id: string | null
          tax_amount: number
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allocated_amount?: number
          allocation_percentage?: number | null
          allocation_type: string
          change_order_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          division_id?: string | null
          entity_id?: string
          id?: string
          invoice_id?: string | null
          markup_amount?: number
          milestone_id?: string | null
          notes?: string | null
          phase_id?: string | null
          project_id?: string | null
          retainage_amount?: number
          sov_item_id?: string | null
          tax_amount?: number
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allocated_amount?: number
          allocation_percentage?: number | null
          allocation_type?: string
          change_order_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          division_id?: string | null
          entity_id?: string
          id?: string
          invoice_id?: string | null
          markup_amount?: number
          milestone_id?: string | null
          notes?: string | null
          phase_id?: string | null
          project_id?: string | null
          retainage_amount?: number
          sov_item_id?: string | null
          tax_amount?: number
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transaction_allocations_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "project_change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transaction_allocations_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "finance_cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transaction_allocations_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "finance_construction_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transaction_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transaction_allocations_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transaction_allocations_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "finance_project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transaction_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "finance_transaction_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transaction_allocations_sov_item_id_fkey"
            columns: ["sov_item_id"]
            isOneToOne: false
            referencedRelation: "project_scope_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transaction_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          acquisition_date: string
          asset_category: string
          asset_name: string
          asset_tag: string | null
          cost_basis: number
          created_at: string
          deleted_at: string | null
          depreciation_method: string
          disposal_amount: number | null
          disposal_date: string | null
          entity_id: string
          id: string
          notes: string | null
          placed_in_service_date: string
          project_id: string | null
          salvage_value: number
          status: string
          updated_at: string
          useful_life_years: number
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          acquisition_date: string
          asset_category?: string
          asset_name: string
          asset_tag?: string | null
          cost_basis: number
          created_at?: string
          deleted_at?: string | null
          depreciation_method?: string
          disposal_amount?: number | null
          disposal_date?: string | null
          entity_id?: string
          id?: string
          notes?: string | null
          placed_in_service_date: string
          project_id?: string | null
          salvage_value?: number
          status?: string
          updated_at?: string
          useful_life_years: number
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          acquisition_date?: string
          asset_category?: string
          asset_name?: string
          asset_tag?: string | null
          cost_basis?: number
          created_at?: string
          deleted_at?: string | null
          depreciation_method?: string
          disposal_amount?: number | null
          disposal_date?: string | null
          entity_id?: string
          id?: string
          notes?: string | null
          placed_in_service_date?: string
          project_id?: string | null
          salvage_value?: number
          status?: string
          updated_at?: string
          useful_life_years?: number
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "fixed_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      hgp_customer_sites: {
        Row: {
          agreement_id: string | null
          city: string | null
          county: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          deleted_at: string | null
          entity_id: string
          equipment_unit_id: string | null
          finance_client_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json
          notes: string | null
          site_address: string | null
          updated_at: string
          user_id: string
          utility_provider: string | null
          zip: string | null
        }
        Insert: {
          agreement_id?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          deleted_at?: string | null
          entity_id?: string
          equipment_unit_id?: string | null
          finance_client_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          notes?: string | null
          site_address?: string | null
          updated_at?: string
          user_id: string
          utility_provider?: string | null
          zip?: string | null
        }
        Update: {
          agreement_id?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          deleted_at?: string | null
          entity_id?: string
          equipment_unit_id?: string | null
          finance_client_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          notes?: string | null
          site_address?: string | null
          updated_at?: string
          user_id?: string
          utility_provider?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hgp_customer_sites_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "hgp_service_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hgp_customer_sites_equipment_unit_id_fkey"
            columns: ["equipment_unit_id"]
            isOneToOne: false
            referencedRelation: "hgp_equipment_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hgp_customer_sites_finance_client_id_fkey"
            columns: ["finance_client_id"]
            isOneToOne: false
            referencedRelation: "finance_client_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      hgp_equipment_units: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          deleted_at: string | null
          deposit_amount: number
          deposit_received_date: string | null
          entity_id: string
          fuel_type: string
          id: string
          inspection_status: string | null
          install_date: string | null
          install_labor_cost: number
          kw_rating: number | null
          model: string
          notes: string | null
          permit_number: string | null
          permit_status: string | null
          po_id: string | null
          project_id: string | null
          purchase_date: string | null
          sale_price: number | null
          serial_number: string | null
          status: string
          unit_cost: number
          updated_at: string
          user_id: string
          vendor_id: string | null
          warranty_end: string | null
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          deposit_amount?: number
          deposit_received_date?: string | null
          entity_id?: string
          fuel_type?: string
          id?: string
          inspection_status?: string | null
          install_date?: string | null
          install_labor_cost?: number
          kw_rating?: number | null
          model: string
          notes?: string | null
          permit_number?: string | null
          permit_status?: string | null
          po_id?: string | null
          project_id?: string | null
          purchase_date?: string | null
          sale_price?: number | null
          serial_number?: string | null
          status?: string
          unit_cost?: number
          updated_at?: string
          user_id: string
          vendor_id?: string | null
          warranty_end?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          deposit_amount?: number
          deposit_received_date?: string | null
          entity_id?: string
          fuel_type?: string
          id?: string
          inspection_status?: string | null
          install_date?: string | null
          install_labor_cost?: number
          kw_rating?: number | null
          model?: string
          notes?: string | null
          permit_number?: string | null
          permit_status?: string | null
          po_id?: string | null
          project_id?: string | null
          purchase_date?: string | null
          sale_price?: number | null
          serial_number?: string | null
          status?: string
          unit_cost?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
          warranty_end?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hgp_equipment_units_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "hgp_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hgp_equipment_units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "hgp_equipment_units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hgp_equipment_units_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      hgp_inventory_movements: {
        Row: {
          created_at: string
          deleted_at: string | null
          entity_id: string
          equipment_unit_id: string | null
          id: string
          job_id: string | null
          memo: string | null
          metadata: Json
          movement_type: string
          part_id: string | null
          quantity: number
          total_cost: number | null
          unit_cost: number | null
          updated_at: string
          user_id: string
          vendor_id: string | null
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          equipment_unit_id?: string | null
          id?: string
          job_id?: string | null
          memo?: string | null
          metadata?: Json
          movement_type: string
          part_id?: string | null
          quantity?: number
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          user_id: string
          vendor_id?: string | null
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          equipment_unit_id?: string | null
          id?: string
          job_id?: string | null
          memo?: string | null
          metadata?: Json
          movement_type?: string
          part_id?: string | null
          quantity?: number
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hgp_inventory_movements_equipment_unit_id_fkey"
            columns: ["equipment_unit_id"]
            isOneToOne: false
            referencedRelation: "hgp_equipment_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hgp_inventory_movements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hgp_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hgp_inventory_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "hgp_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hgp_inventory_movements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hgp_inventory_movements_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "hgp_service_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      hgp_job_payments: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          entity_id: string
          id: string
          job_id: string
          memo: string | null
          method: string
          payment_date: string
          payment_type: string
          reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          job_id: string
          memo?: string | null
          method?: string
          payment_date?: string
          payment_type?: string
          reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          job_id?: string
          memo?: string | null
          method?: string
          payment_date?: string
          payment_type?: string
          reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hgp_job_payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hgp_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      hgp_jobs: {
        Row: {
          city: string | null
          completed_date: string | null
          county: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          deleted_at: string | null
          deposit_amount: number
          dispatch_status: string
          emergency: boolean
          entity_id: string
          equipment_cost: number
          equipment_status: string
          equipment_unit_id: string | null
          finance_client_id: string | null
          fuel_type: string
          generator_model: string | null
          id: string
          inspection_status: string
          job_type: string
          kw_rating: number | null
          labor_cost: number
          latitude: number | null
          longitude: number | null
          maintenance_enrolled: boolean
          materials_cost: number
          metadata: Json
          notes: string | null
          outage_event_id: string | null
          permit_cost: number
          permit_status: string
          quoted_amount: number
          serial_number: string | null
          site_address: string | null
          stage: string
          subcontractor_cost: number
          target_install_date: string | null
          technician: string | null
          transfer_switch: string | null
          updated_at: string
          user_id: string
          utility_provider: string | null
          vendor_id: string | null
          warranty_status: string | null
          zip: string | null
        }
        Insert: {
          city?: string | null
          completed_date?: string | null
          county?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          deleted_at?: string | null
          deposit_amount?: number
          dispatch_status?: string
          emergency?: boolean
          entity_id?: string
          equipment_cost?: number
          equipment_status?: string
          equipment_unit_id?: string | null
          finance_client_id?: string | null
          fuel_type?: string
          generator_model?: string | null
          id?: string
          inspection_status?: string
          job_type?: string
          kw_rating?: number | null
          labor_cost?: number
          latitude?: number | null
          longitude?: number | null
          maintenance_enrolled?: boolean
          materials_cost?: number
          metadata?: Json
          notes?: string | null
          outage_event_id?: string | null
          permit_cost?: number
          permit_status?: string
          quoted_amount?: number
          serial_number?: string | null
          site_address?: string | null
          stage?: string
          subcontractor_cost?: number
          target_install_date?: string | null
          technician?: string | null
          transfer_switch?: string | null
          updated_at?: string
          user_id: string
          utility_provider?: string | null
          vendor_id?: string | null
          warranty_status?: string | null
          zip?: string | null
        }
        Update: {
          city?: string | null
          completed_date?: string | null
          county?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          deleted_at?: string | null
          deposit_amount?: number
          dispatch_status?: string
          emergency?: boolean
          entity_id?: string
          equipment_cost?: number
          equipment_status?: string
          equipment_unit_id?: string | null
          finance_client_id?: string | null
          fuel_type?: string
          generator_model?: string | null
          id?: string
          inspection_status?: string
          job_type?: string
          kw_rating?: number | null
          labor_cost?: number
          latitude?: number | null
          longitude?: number | null
          maintenance_enrolled?: boolean
          materials_cost?: number
          metadata?: Json
          notes?: string | null
          outage_event_id?: string | null
          permit_cost?: number
          permit_status?: string
          quoted_amount?: number
          serial_number?: string | null
          site_address?: string | null
          stage?: string
          subcontractor_cost?: number
          target_install_date?: string | null
          technician?: string | null
          transfer_switch?: string | null
          updated_at?: string
          user_id?: string
          utility_provider?: string | null
          vendor_id?: string | null
          warranty_status?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hgp_jobs_equipment_unit_id_fkey"
            columns: ["equipment_unit_id"]
            isOneToOne: false
            referencedRelation: "hgp_equipment_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hgp_jobs_finance_client_id_fkey"
            columns: ["finance_client_id"]
            isOneToOne: false
            referencedRelation: "finance_client_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hgp_jobs_outage_event_id_fkey"
            columns: ["outage_event_id"]
            isOneToOne: false
            referencedRelation: "hgp_outage_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hgp_jobs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      hgp_outage_events: {
        Row: {
          affected_customers: number
          cause: string | null
          city: string | null
          county: string | null
          created_at: string
          deleted_at: string | null
          entity_id: string
          estimated_restoration_at: string | null
          external_outage_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json
          outage_started_at: string | null
          provider: string
          resolved_at: string | null
          source_id: string | null
          status: string
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          affected_customers?: number
          cause?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          estimated_restoration_at?: string | null
          external_outage_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          outage_started_at?: string | null
          provider: string
          resolved_at?: string | null
          source_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          affected_customers?: number
          cause?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          estimated_restoration_at?: string | null
          external_outage_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          outage_started_at?: string | null
          provider?: string
          resolved_at?: string | null
          source_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hgp_outage_events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "hgp_outage_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      hgp_outage_impacts: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          match_basis: string
          notes: string | null
          outage_event_id: string
          outreach_status: string
          site_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string
          id?: string
          match_basis?: string
          notes?: string | null
          outage_event_id: string
          outreach_status?: string
          site_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          match_basis?: string
          notes?: string | null
          outage_event_id?: string
          outreach_status?: string
          site_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hgp_outage_impacts_outage_event_id_fkey"
            columns: ["outage_event_id"]
            isOneToOne: false
            referencedRelation: "hgp_outage_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hgp_outage_impacts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "hgp_customer_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      hgp_outage_sources: {
        Row: {
          active: boolean
          created_at: string
          id: string
          metadata: Json
          polling_interval_minutes: number | null
          provider: string
          source_type: string
          source_url: string | null
          terms_notes: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          metadata?: Json
          polling_interval_minutes?: number | null
          provider: string
          source_type?: string
          source_url?: string | null
          terms_notes?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          metadata?: Json
          polling_interval_minutes?: number | null
          provider?: string
          source_type?: string
          source_url?: string | null
          terms_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hgp_parts: {
        Row: {
          category: string
          created_at: string
          deleted_at: string | null
          entity_id: string
          id: string
          location: string | null
          metadata: Json
          name: string
          notes: string | null
          qty_on_hand: number
          reorder_point: number
          reorder_qty: number | null
          sku: string | null
          unit_cost: number
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          location?: string | null
          metadata?: Json
          name: string
          notes?: string | null
          qty_on_hand?: number
          reorder_point?: number
          reorder_qty?: number | null
          sku?: string | null
          unit_cost?: number
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          location?: string | null
          metadata?: Json
          name?: string
          notes?: string | null
          qty_on_hand?: number
          reorder_point?: number
          reorder_qty?: number | null
          sku?: string | null
          unit_cost?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hgp_parts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      hgp_purchase_orders: {
        Row: {
          created_at: string
          deleted_at: string | null
          entity_id: string
          id: string
          memo: string | null
          order_date: string
          po_number: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          memo?: string | null
          order_date?: string
          po_number?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          memo?: string | null
          order_date?: string
          po_number?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hgp_purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      hgp_service_agreements: {
        Row: {
          annual_value: number
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          deleted_at: string | null
          emergency_coverage: boolean
          end_date: string | null
          entity_id: string
          equipment_unit_id: string | null
          id: string
          last_visit_date: string | null
          next_visit_date: string | null
          notes: string | null
          plan: string
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
          visits_per_year: number
        }
        Insert: {
          annual_value?: number
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          deleted_at?: string | null
          emergency_coverage?: boolean
          end_date?: string | null
          entity_id?: string
          equipment_unit_id?: string | null
          id?: string
          last_visit_date?: string | null
          next_visit_date?: string | null
          notes?: string | null
          plan?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
          visits_per_year?: number
        }
        Update: {
          annual_value?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          deleted_at?: string | null
          emergency_coverage?: boolean
          end_date?: string | null
          entity_id?: string
          equipment_unit_id?: string | null
          id?: string
          last_visit_date?: string | null
          next_visit_date?: string | null
          notes?: string | null
          plan?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          visits_per_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "hgp_service_agreements_equipment_unit_id_fkey"
            columns: ["equipment_unit_id"]
            isOneToOne: false
            referencedRelation: "hgp_equipment_units"
            referencedColumns: ["id"]
          },
        ]
      }
      hgp_service_visits: {
        Row: {
          agreement_id: string | null
          cost: number
          created_at: string
          customer_name: string
          deleted_at: string | null
          entity_id: string
          equipment_unit_id: string | null
          finance_client_id: string | null
          id: string
          labor_hours: number
          revenue: number
          status: string
          summary: string | null
          technician: string | null
          updated_at: string
          user_id: string
          visit_date: string
          visit_type: string
        }
        Insert: {
          agreement_id?: string | null
          cost?: number
          created_at?: string
          customer_name: string
          deleted_at?: string | null
          entity_id?: string
          equipment_unit_id?: string | null
          finance_client_id?: string | null
          id?: string
          labor_hours?: number
          revenue?: number
          status?: string
          summary?: string | null
          technician?: string | null
          updated_at?: string
          user_id: string
          visit_date?: string
          visit_type?: string
        }
        Update: {
          agreement_id?: string | null
          cost?: number
          created_at?: string
          customer_name?: string
          deleted_at?: string | null
          entity_id?: string
          equipment_unit_id?: string | null
          finance_client_id?: string | null
          id?: string
          labor_hours?: number
          revenue?: number
          status?: string
          summary?: string | null
          technician?: string | null
          updated_at?: string
          user_id?: string
          visit_date?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hgp_service_visits_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "hgp_service_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hgp_service_visits_equipment_unit_id_fkey"
            columns: ["equipment_unit_id"]
            isOneToOne: false
            referencedRelation: "hgp_equipment_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hgp_service_visits_finance_client_id_fkey"
            columns: ["finance_client_id"]
            isOneToOne: false
            referencedRelation: "finance_client_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings_capital_activity: {
        Row: {
          activity_date: string
          activity_type: string
          amount: number
          approval_notes: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          deleted_at: string | null
          entity_id: string
          id: string
          memo: string | null
          related_entity_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_date?: string
          activity_type: string
          amount: number
          approval_notes?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          memo?: string | null
          related_entity_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          amount?: number
          approval_notes?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          memo?: string | null
          related_entity_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      holdings_covenants: {
        Row: {
          covenant_type: string
          created_at: string
          deleted_at: string | null
          entity_id: string
          id: string
          last_reviewed_date: string | null
          metadata: Json
          name: string
          next_review_date: string | null
          note_id: string | null
          notes: string | null
          requirement: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          covenant_type?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          last_reviewed_date?: string | null
          metadata?: Json
          name: string
          next_review_date?: string | null
          note_id?: string | null
          notes?: string | null
          requirement?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          covenant_type?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          last_reviewed_date?: string | null
          metadata?: Json
          name?: string
          next_review_date?: string | null
          note_id?: string | null
          notes?: string | null
          requirement?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_covenants_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "holdings_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings_note_payments: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          entity_id: string
          id: string
          interest_portion: number
          memo: string | null
          note_id: string
          payment_date: string
          principal_portion: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          interest_portion?: number
          memo?: string | null
          note_id: string
          payment_date?: string
          principal_portion?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          interest_portion?: number
          memo?: string | null
          note_id?: string
          payment_date?: string
          principal_portion?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_note_payments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "holdings_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings_notes: {
        Row: {
          collateral: string | null
          counterparty_entity_id: string | null
          counterparty_name: string
          created_at: string
          deleted_at: string | null
          direction: string
          entity_id: string
          id: string
          interest_rate: number
          maturity_date: string | null
          note_type: string
          notes: string | null
          origination_date: string | null
          outstanding_balance: number
          payment_amount: number | null
          payment_frequency: string
          principal: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collateral?: string | null
          counterparty_entity_id?: string | null
          counterparty_name: string
          created_at?: string
          deleted_at?: string | null
          direction: string
          entity_id?: string
          id?: string
          interest_rate?: number
          maturity_date?: string | null
          note_type?: string
          notes?: string | null
          origination_date?: string | null
          outstanding_balance?: number
          payment_amount?: number | null
          payment_frequency?: string
          principal?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collateral?: string | null
          counterparty_entity_id?: string | null
          counterparty_name?: string
          created_at?: string
          deleted_at?: string | null
          direction?: string
          entity_id?: string
          id?: string
          interest_rate?: number
          maturity_date?: string | null
          note_type?: string
          notes?: string | null
          origination_date?: string | null
          outstanding_balance?: number
          payment_amount?: number | null
          payment_frequency?: string
          principal?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_paid: number
          client_address: string
          client_company: string
          client_email: string
          client_id: string | null
          client_name: string
          client_visible: boolean
          created_at: string
          due_date: string
          entity_id: string
          external_invoice_label: string | null
          external_invoice_number: string | null
          external_invoice_provider: string | null
          external_invoice_url: string | null
          finance_client_id: string | null
          hgp_job_id: string | null
          id: string
          internal_memo: string | null
          invoice_number: string
          issue_date: string
          line_items: Json
          notes: string
          paid_at: string | null
          payment_terms: string | null
          portal_client_id: string | null
          project_id: string | null
          public_memo: string | null
          retainage_amount: number
          retainage_held: number | null
          retainage_pct: number | null
          retainage_percent: number | null
          retainage_released: number
          retainage_withheld: number
          status: string
          stripe_payment_link: string | null
          tax_rate: number
          terms: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          client_address?: string
          client_company?: string
          client_email?: string
          client_id?: string | null
          client_name?: string
          client_visible?: boolean
          created_at?: string
          due_date?: string
          entity_id?: string
          external_invoice_label?: string | null
          external_invoice_number?: string | null
          external_invoice_provider?: string | null
          external_invoice_url?: string | null
          finance_client_id?: string | null
          hgp_job_id?: string | null
          id?: string
          internal_memo?: string | null
          invoice_number: string
          issue_date?: string
          line_items?: Json
          notes?: string
          paid_at?: string | null
          payment_terms?: string | null
          portal_client_id?: string | null
          project_id?: string | null
          public_memo?: string | null
          retainage_amount?: number
          retainage_held?: number | null
          retainage_pct?: number | null
          retainage_percent?: number | null
          retainage_released?: number
          retainage_withheld?: number
          status?: string
          stripe_payment_link?: string | null
          tax_rate?: number
          terms?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          client_address?: string
          client_company?: string
          client_email?: string
          client_id?: string | null
          client_name?: string
          client_visible?: boolean
          created_at?: string
          due_date?: string
          entity_id?: string
          external_invoice_label?: string | null
          external_invoice_number?: string | null
          external_invoice_provider?: string | null
          external_invoice_url?: string | null
          finance_client_id?: string | null
          hgp_job_id?: string | null
          id?: string
          internal_memo?: string | null
          invoice_number?: string
          issue_date?: string
          line_items?: Json
          notes?: string
          paid_at?: string | null
          payment_terms?: string | null
          portal_client_id?: string | null
          project_id?: string | null
          public_memo?: string | null
          retainage_amount?: number
          retainage_held?: number | null
          retainage_pct?: number | null
          retainage_percent?: number | null
          retainage_released?: number
          retainage_withheld?: number
          status?: string
          stripe_payment_link?: string | null
          tax_rate?: number
          terms?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_finance_client_id_fkey"
            columns: ["finance_client_id"]
            isOneToOne: false
            referencedRelation: "finance_client_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_hgp_job_id_fkey"
            columns: ["hgp_job_id"]
            isOneToOne: false
            referencedRelation: "hgp_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_portal_client_id_fkey"
            columns: ["portal_client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_admin_log: {
        Row: {
          action: string
          actor: string
          client_id: string | null
          created_at: string
          details: string | null
          id: string
        }
        Insert: {
          action: string
          actor?: string
          client_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string
          client_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_admin_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_admin_notes: {
        Row: {
          author: string
          body: string
          client_id: string
          created_at: string
          id: string
        }
        Insert: {
          author?: string
          body: string
          client_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author?: string
          body?: string
          client_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_admin_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_briefs: {
        Row: {
          bathrooms: string | null
          bedrooms: string | null
          budget: string | null
          client_id: string
          created_at: string
          description: string | null
          floors: string | null
          id: string
          location: string | null
          project_id: string | null
          sqft: string | null
          status: Database["public"]["Enums"]["brief_status"]
          style: string[] | null
          submitted_at: string | null
          timeline: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          bathrooms?: string | null
          bedrooms?: string | null
          budget?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          floors?: string | null
          id?: string
          location?: string | null
          project_id?: string | null
          sqft?: string | null
          status?: Database["public"]["Enums"]["brief_status"]
          style?: string[] | null
          submitted_at?: string | null
          timeline?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          bathrooms?: string | null
          bedrooms?: string | null
          budget?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          floors?: string | null
          id?: string
          location?: string | null
          project_id?: string | null
          sqft?: string | null
          status?: Database["public"]["Enums"]["brief_status"]
          style?: string[] | null
          submitted_at?: string | null
          timeline?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_briefs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_briefs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "admin_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_clients: {
        Row: {
          approved_at: string | null
          created_at: string
          email: string
          id: string
          name: string
          password_hash: string | null
          phone: string | null
          project_interest: string | null
          project_type: string | null
          rejected_at: string | null
          status: Database["public"]["Enums"]["portal_client_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          password_hash?: string | null
          phone?: string | null
          project_interest?: string | null
          project_type?: string | null
          rejected_at?: string | null
          status?: Database["public"]["Enums"]["portal_client_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          password_hash?: string | null
          phone?: string | null
          project_interest?: string | null
          project_type?: string | null
          rejected_at?: string | null
          status?: Database["public"]["Enums"]["portal_client_status"]
          updated_at?: string
        }
        Relationships: []
      }
      portal_documents: {
        Row: {
          category: Database["public"]["Enums"]["doc_category"]
          client_id: string | null
          created_at: string
          description: string | null
          file_size: string | null
          file_type: string
          file_url: string | null
          id: string
          name: string
          project_id: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["doc_status"]
          storage_path: string | null
          updated_at: string
          uploaded_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["doc_category"]
          client_id?: string | null
          created_at?: string
          description?: string | null
          file_size?: string | null
          file_type: string
          file_url?: string | null
          id?: string
          name: string
          project_id?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path?: string | null
          updated_at?: string
          uploaded_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["doc_category"]
          client_id?: string | null
          created_at?: string
          description?: string | null
          file_size?: string | null
          file_type?: string
          file_url?: string | null
          id?: string
          name?: string
          project_id?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path?: string | null
          updated_at?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "admin_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_help_requests: {
        Row: {
          client_id: string
          created_at: string
          id: string
          message: string
          project_id: string | null
          project_title: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          message: string
          project_id?: string | null
          project_title?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          message?: string
          project_id?: string | null
          project_title?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_help_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          name: string | null
          project_id: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          name?: string | null
          project_id?: string | null
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          name?: string | null
          project_id?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "admin_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_meetings: {
        Row: {
          client_id: string
          created_at: string
          date: string
          format: Database["public"]["Enums"]["meeting_format"]
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["meeting_status"]
          time: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date: string
          format: Database["public"]["Enums"]["meeting_format"]
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          time: string
          type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          format?: Database["public"]["Enums"]["meeting_format"]
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          time?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_messages: {
        Row: {
          body: string
          client_id: string
          created_at: string
          id: string
          sender: Database["public"]["Enums"]["message_sender"]
          sender_name: string
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string
          id?: string
          sender: Database["public"]["Enums"]["message_sender"]
          sender_name: string
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          sender?: Database["public"]["Enums"]["message_sender"]
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          featured: boolean
          id: string
          image_url: string | null
          location: string
          sort_order: number
          sqft: string | null
          title: string
          updated_at: string
          year: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          location: string
          sort_order?: number
          sqft?: string | null
          title: string
          updated_at?: string
          year?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          location?: string
          sort_order?: number
          sqft?: string | null
          title?: string
          updated_at?: string
          year?: string | null
        }
        Relationships: []
      }
      portfolio_media: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          media_type: string
          project_id: string
          sort_order: number
          storage_path: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type: string
          project_id: string
          sort_order?: number
          storage_path: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: string
          project_id?: string
          sort_order?: number
          storage_path?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projects: {
        Row: {
          budget: string | null
          category: string
          city: string
          client_name: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          location: string
          sort_order: number
          sqft: string | null
          title: string
          updated_at: string
          year: string
        }
        Insert: {
          budget?: string | null
          category?: string
          city?: string
          client_name?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          location?: string
          sort_order?: number
          sqft?: string | null
          title: string
          updated_at?: string
          year?: string
        }
        Update: {
          budget?: string | null
          category?: string
          city?: string
          client_name?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          location?: string
          sort_order?: number
          sqft?: string | null
          title?: string
          updated_at?: string
          year?: string
        }
        Relationships: []
      }
      procurement_material_requirements: {
        Row: {
          category: string
          created_at: string
          deleted_at: string | null
          entity_id: string
          id: string
          material_name: string
          metadata: Json
          normalized_material: string | null
          notes: string | null
          priority: string
          project_id: string | null
          quantity: number
          required_by: string | null
          scope_item_id: string | null
          status: string
          target_unit_price: number | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          material_name: string
          metadata?: Json
          normalized_material?: string | null
          notes?: string | null
          priority?: string
          project_id?: string | null
          quantity?: number
          required_by?: string | null
          scope_item_id?: string | null
          status?: string
          target_unit_price?: number | null
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          material_name?: string
          metadata?: Json
          normalized_material?: string | null
          notes?: string | null
          priority?: string
          project_id?: string | null
          quantity?: number
          required_by?: string | null
          scope_item_id?: string | null
          status?: string
          target_unit_price?: number | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_material_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "procurement_material_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_material_requirements_scope_item_id_fkey"
            columns: ["scope_item_id"]
            isOneToOne: false
            referencedRelation: "project_scope_items"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_price_quotes: {
        Row: {
          captured_at: string
          category: string | null
          confidence: number
          created_at: string
          deleted_at: string | null
          entity_id: string
          expires_at: string | null
          id: string
          material_name: string
          metadata: Json
          min_quantity: number
          normalized_material: string | null
          quote_source: string
          quote_url: string | null
          raw_excerpt: string | null
          supplier_source_id: string | null
          unit: string
          unit_price: number
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          captured_at?: string
          category?: string | null
          confidence?: number
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          expires_at?: string | null
          id?: string
          material_name: string
          metadata?: Json
          min_quantity?: number
          normalized_material?: string | null
          quote_source?: string
          quote_url?: string | null
          raw_excerpt?: string | null
          supplier_source_id?: string | null
          unit?: string
          unit_price: number
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          captured_at?: string
          category?: string | null
          confidence?: number
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          expires_at?: string | null
          id?: string
          material_name?: string
          metadata?: Json
          min_quantity?: number
          normalized_material?: string | null
          quote_source?: string
          quote_url?: string | null
          raw_excerpt?: string | null
          supplier_source_id?: string | null
          unit?: string
          unit_price?: number
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_price_quotes_supplier_source_id_fkey"
            columns: ["supplier_source_id"]
            isOneToOne: false
            referencedRelation: "procurement_supplier_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_price_quotes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_rfq_batches: {
        Row: {
          awarded_supplier_source_id: string | null
          created_at: string
          deleted_at: string | null
          due_date: string | null
          entity_id: string
          estimated_savings: number
          id: string
          metadata: Json
          notes: string | null
          project_count: number
          rfq_number: string
          sent_at: string | null
          status: string
          supplier_count: number
          title: string
          total_estimated_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          awarded_supplier_source_id?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          entity_id?: string
          estimated_savings?: number
          id?: string
          metadata?: Json
          notes?: string | null
          project_count?: number
          rfq_number: string
          sent_at?: string | null
          status?: string
          supplier_count?: number
          title: string
          total_estimated_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          awarded_supplier_source_id?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          entity_id?: string
          estimated_savings?: number
          id?: string
          metadata?: Json
          notes?: string | null
          project_count?: number
          rfq_number?: string
          sent_at?: string | null
          status?: string
          supplier_count?: number
          title?: string
          total_estimated_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_rfq_batches_awarded_supplier_source_id_fkey"
            columns: ["awarded_supplier_source_id"]
            isOneToOne: false
            referencedRelation: "procurement_supplier_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_rfq_lines: {
        Row: {
          best_supplier_name: string | null
          best_unit_price: number | null
          category: string | null
          created_at: string
          entity_id: string
          estimated_line_cost: number
          estimated_line_savings: number
          id: string
          material_name: string
          metadata: Json
          normalized_material: string
          project_count: number
          requirement_ids: string[]
          rfq_batch_id: string
          target_unit_price: number | null
          total_quantity: number
          unit: string
          user_id: string
        }
        Insert: {
          best_supplier_name?: string | null
          best_unit_price?: number | null
          category?: string | null
          created_at?: string
          entity_id?: string
          estimated_line_cost?: number
          estimated_line_savings?: number
          id?: string
          material_name: string
          metadata?: Json
          normalized_material: string
          project_count?: number
          requirement_ids?: string[]
          rfq_batch_id: string
          target_unit_price?: number | null
          total_quantity?: number
          unit?: string
          user_id: string
        }
        Update: {
          best_supplier_name?: string | null
          best_unit_price?: number | null
          category?: string | null
          created_at?: string
          entity_id?: string
          estimated_line_cost?: number
          estimated_line_savings?: number
          id?: string
          material_name?: string
          metadata?: Json
          normalized_material?: string
          project_count?: number
          requirement_ids?: string[]
          rfq_batch_id?: string
          target_unit_price?: number | null
          total_quantity?: number
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_rfq_lines_rfq_batch_id_fkey"
            columns: ["rfq_batch_id"]
            isOneToOne: false
            referencedRelation: "procurement_rfq_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_supplier_sources: {
        Row: {
          active: boolean
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          deleted_at: string | null
          entity_id: string
          id: string
          last_scraped_at: string | null
          metadata: Json
          preferred_categories: string[]
          source_type: string
          source_url: string | null
          supplier_name: string
          terms_notes: string | null
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          active?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          last_scraped_at?: string | null
          metadata?: Json
          preferred_categories?: string[]
          source_type?: string
          source_url?: string | null
          supplier_name: string
          terms_notes?: string | null
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          active?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          id?: string
          last_scraped_at?: string | null
          metadata?: Json
          preferred_categories?: string[]
          source_type?: string
          source_url?: string | null
          supplier_name?: string
          terms_notes?: string | null
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_supplier_sources_vendor_id_fkey"
            columns: ["vendor_id"]
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
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_add_ons: {
        Row: {
          amount: number
          approval_method: string | null
          approved_date: string | null
          client_visible: boolean
          client_visible_notes: string | null
          created_at: string
          custom_fields: Json
          entity_id: string
          id: string
          internal_notes: string | null
          kind: string
          line_item: string
          project_id: string
          requested_date: string | null
          sort_order: number
          status: string
          unit_cost: number | null
          unit_label: string | null
          unit_quantity: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          approval_method?: string | null
          approved_date?: string | null
          client_visible?: boolean
          client_visible_notes?: string | null
          created_at?: string
          custom_fields?: Json
          entity_id?: string
          id?: string
          internal_notes?: string | null
          kind?: string
          line_item: string
          project_id: string
          requested_date?: string | null
          sort_order?: number
          status?: string
          unit_cost?: number | null
          unit_label?: string | null
          unit_quantity?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approval_method?: string | null
          approved_date?: string | null
          client_visible?: boolean
          client_visible_notes?: string | null
          created_at?: string
          custom_fields?: Json
          entity_id?: string
          id?: string
          internal_notes?: string | null
          kind?: string
          line_item?: string
          project_id?: string
          requested_date?: string | null
          sort_order?: number
          status?: string
          unit_cost?: number | null
          unit_label?: string | null
          unit_quantity?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_add_ons_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_add_ons_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_change_orders: {
        Row: {
          amount: number
          amount_billed: number
          amount_paid: number
          approval_method: string | null
          approved_date: string | null
          client_visible_notes: string | null
          co_number: string | null
          created_at: string
          description: string | null
          entity_id: string
          id: string
          internal_notes: string | null
          notes: string | null
          project_id: string
          requested_date: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          amount_billed?: number
          amount_paid?: number
          approval_method?: string | null
          approved_date?: string | null
          client_visible_notes?: string | null
          co_number?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string
          id?: string
          internal_notes?: string | null
          notes?: string | null
          project_id: string
          requested_date?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_billed?: number
          amount_paid?: number
          approval_method?: string | null
          approved_date?: string | null
          client_visible_notes?: string | null
          co_number?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string
          id?: string
          internal_notes?: string | null
          notes?: string | null
          project_id?: string
          requested_date?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestone_sov_links: {
        Row: {
          allocation_amount: number | null
          allocation_percentage: number | null
          created_at: string
          entity_id: string
          id: string
          milestone_id: string
          notes: string | null
          sov_item_id: string
          sync_completion: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_amount?: number | null
          allocation_percentage?: number | null
          created_at?: string
          entity_id?: string
          id?: string
          milestone_id: string
          notes?: string | null
          sov_item_id: string
          sync_completion?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_amount?: number | null
          allocation_percentage?: number | null
          created_at?: string
          entity_id?: string
          id?: string
          milestone_id?: string
          notes?: string | null
          sov_item_id?: string
          sync_completion?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestone_sov_links_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestone_sov_links_sov_item_id_fkey"
            columns: ["sov_item_id"]
            isOneToOne: false
            referencedRelation: "project_scope_items"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          actual_completion_date: string | null
          admin_notes: string | null
          billing_amount: number
          billing_eligible: boolean
          client_id: string | null
          client_visible: boolean
          client_visible_notes: string | null
          completed_date: string | null
          created_at: string | null
          description: string | null
          entity_id: string
          id: string
          internal_notes: string | null
          is_active: boolean | null
          percent_complete: number
          phase_description: string | null
          phase_index: number
          phase_name: string | null
          planned_completion_date: string | null
          planned_start_date: string | null
          project_id: string | null
          sort_order: number | null
          status: string
          target_date: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          admin_notes?: string | null
          billing_amount?: number
          billing_eligible?: boolean
          client_id?: string | null
          client_visible?: boolean
          client_visible_notes?: string | null
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string
          id?: string
          internal_notes?: string | null
          is_active?: boolean | null
          percent_complete?: number
          phase_description?: string | null
          phase_index?: number
          phase_name?: string | null
          planned_completion_date?: string | null
          planned_start_date?: string | null
          project_id?: string | null
          sort_order?: number | null
          status?: string
          target_date?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          admin_notes?: string | null
          billing_amount?: number
          billing_eligible?: boolean
          client_id?: string | null
          client_visible?: boolean
          client_visible_notes?: string | null
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string
          id?: string
          internal_notes?: string | null
          is_active?: boolean | null
          percent_complete?: number
          phase_description?: string | null
          phase_index?: number
          phase_name?: string | null
          planned_completion_date?: string | null
          planned_start_date?: string | null
          project_id?: string | null
          sort_order?: number | null
          status?: string
          target_date?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_photos: {
        Row: {
          caption: string | null
          client_id: string
          created_at: string
          file_url: string
          id: string
          phase: string | null
          phase_index: number
          phase_label: string
          project_id: string | null
          storage_path: string | null
          taken_at: string | null
          uploaded_at: string | null
          url: string | null
        }
        Insert: {
          caption?: string | null
          client_id: string
          created_at?: string
          file_url: string
          id?: string
          phase?: string | null
          phase_index?: number
          phase_label?: string
          project_id?: string | null
          storage_path?: string | null
          taken_at?: string | null
          uploaded_at?: string | null
          url?: string | null
        }
        Update: {
          caption?: string | null
          client_id?: string
          created_at?: string
          file_url?: string
          id?: string
          phase?: string | null
          phase_index?: number
          phase_label?: string
          project_id?: string | null
          storage_path?: string | null
          taken_at?: string | null
          uploaded_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_scope_items: {
        Row: {
          approved_credit_amount: number
          category: string | null
          change_order_amount: number
          client_visible_notes: string | null
          contract_amount: number
          cost_code: string | null
          created_at: string
          description: string | null
          entity_id: string
          id: string
          internal_notes: string | null
          milestone_id: string | null
          name: string
          notes: string | null
          payment_status: string
          percent_complete: number
          project_id: string
          sort_order: number
          total_billed: number
          updated_at: string
          user_id: string
          work_status: string
        }
        Insert: {
          approved_credit_amount?: number
          category?: string | null
          change_order_amount?: number
          client_visible_notes?: string | null
          contract_amount?: number
          cost_code?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string
          id?: string
          internal_notes?: string | null
          milestone_id?: string | null
          name: string
          notes?: string | null
          payment_status?: string
          percent_complete?: number
          project_id: string
          sort_order?: number
          total_billed?: number
          updated_at?: string
          user_id: string
          work_status?: string
        }
        Update: {
          approved_credit_amount?: number
          category?: string | null
          change_order_amount?: number
          client_visible_notes?: string | null
          contract_amount?: number
          cost_code?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string
          id?: string
          internal_notes?: string | null
          milestone_id?: string | null
          name?: string
          notes?: string | null
          payment_status?: string
          percent_complete?: number
          project_id?: string
          sort_order?: number
          total_billed?: number
          updated_at?: string
          user_id?: string
          work_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_scope_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_scope_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          admin_project_id: string | null
          budget: number
          client_name_snapshot: string | null
          code: string | null
          created_at: string
          current_contract_value: number
          deleted_at: string | null
          department: string | null
          entity_id: string
          estimated_cost_to_complete: number
          finance_client_id: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          original_contract_value: number
          portal_brief_id: string | null
          portal_client_id: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_project_id?: string | null
          budget?: number
          client_name_snapshot?: string | null
          code?: string | null
          created_at?: string
          current_contract_value?: number
          deleted_at?: string | null
          department?: string | null
          entity_id?: string
          estimated_cost_to_complete?: number
          finance_client_id?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          original_contract_value?: number
          portal_brief_id?: string | null
          portal_client_id?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_project_id?: string | null
          budget?: number
          client_name_snapshot?: string | null
          code?: string | null
          created_at?: string
          current_contract_value?: number
          deleted_at?: string | null
          department?: string | null
          entity_id?: string
          estimated_cost_to_complete?: number
          finance_client_id?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          original_contract_value?: number
          portal_brief_id?: string | null
          portal_client_id?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_admin_project_id_fkey"
            columns: ["admin_project_id"]
            isOneToOne: false
            referencedRelation: "admin_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_finance_client_id_fkey"
            columns: ["finance_client_id"]
            isOneToOne: false
            referencedRelation: "finance_client_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_portal_brief_id_fkey"
            columns: ["portal_brief_id"]
            isOneToOne: false
            referencedRelation: "portal_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_portal_client_id_fkey"
            columns: ["portal_client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      start_project_submissions: {
        Row: {
          budget: string | null
          converted_admin_project_id: string | null
          description: string | null
          email: string
          id: string
          lead_status: string
          location: string | null
          name: string
          phone: string | null
          priorities: string[] | null
          project_title: string | null
          scope: string | null
          source: string
          sqft: string | null
          start_timeline: string | null
          submitted_at: string
          type: string | null
        }
        Insert: {
          budget?: string | null
          converted_admin_project_id?: string | null
          description?: string | null
          email: string
          id?: string
          lead_status?: string
          location?: string | null
          name: string
          phone?: string | null
          priorities?: string[] | null
          project_title?: string | null
          scope?: string | null
          source?: string
          sqft?: string | null
          start_timeline?: string | null
          submitted_at?: string
          type?: string | null
        }
        Update: {
          budget?: string | null
          converted_admin_project_id?: string | null
          description?: string | null
          email?: string
          id?: string
          lead_status?: string
          location?: string | null
          name?: string
          phone?: string | null
          priorities?: string[] | null
          project_title?: string | null
          scope?: string | null
          source?: string
          sqft?: string | null
          start_timeline?: string | null
          submitted_at?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "start_project_submissions_converted_admin_project_id_fkey"
            columns: ["converted_admin_project_id"]
            isOneToOne: false
            referencedRelation: "admin_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_events: {
        Row: {
          area: string
          created_at: string
          details: Json
          entity_id: string | null
          id: string
          message: string
          resolved_at: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          area: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          id?: string
          message: string
          resolved_at?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          area?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          id?: string
          message?: string
          resolved_at?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          accounting_period: string | null
          amount: number
          amount_before_tax: number | null
          approval_notes: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          attachment_count: number
          bank_account_id: string | null
          billable_amount: number
          billable_status: string
          budget_category: string | null
          budget_line_item: string | null
          category: string | null
          change_order_id: string | null
          check_reference: string | null
          cleared_date: string | null
          client_id: string | null
          commitment_ref: string | null
          construction_division_id: string | null
          cost_code_id: string | null
          cost_phase: string | null
          cost_type: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          department: string | null
          description: string | null
          due_date: string | null
          entity_id: string
          expense_type: string | null
          external_invoice_number: string | null
          external_invoice_provider: string | null
          external_invoice_url: string | null
          external_reference: string | null
          finance_client_id: string | null
          fiscal_year: number | null
          id: string
          import_batch_id: string | null
          internal_memo: string | null
          invoice_id: string | null
          location: string | null
          markup_amount: number
          milestone_id: string | null
          net_amount: number | null
          notes: string | null
          original_transaction_id: string | null
          paid_at: string | null
          paid_date: string | null
          parent_transaction_id: string | null
          payment_method: string | null
          payment_status: string
          posting_date: string | null
          processing_fee: number
          project_id: string | null
          project_phase_id: string | null
          public_memo: string | null
          purchase_order_ref: string | null
          quantity: number | null
          receipt_status: string
          reconciled: boolean
          reconciled_at: string | null
          reconciliation_status: string
          reimbursable_status: string
          rejection_reason: string | null
          retainage_amount: number | null
          retainage_percent: number | null
          scope_item_id: string | null
          source_name: string | null
          status: string
          subcontractor_id: string | null
          subcontractor_retainage_released: number
          subcontractor_retainage_withheld: number
          submitted_at: string | null
          submitted_by: string | null
          subtype: string | null
          sync_status: string
          tags: string[]
          tax_amount: number
          total_amount: number | null
          transaction_date: string
          transaction_number: string | null
          type: Database["public"]["Enums"]["txn_type"]
          unit: string | null
          unit_cost: number | null
          updated_at: string
          updated_by: string | null
          user_id: string
          vendor_bill_ref: string | null
          vendor_id: string | null
          work_completed_pct: number | null
        }
        Insert: {
          accounting_period?: string | null
          amount: number
          amount_before_tax?: number | null
          approval_notes?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          attachment_count?: number
          bank_account_id?: string | null
          billable_amount?: number
          billable_status?: string
          budget_category?: string | null
          budget_line_item?: string | null
          category?: string | null
          change_order_id?: string | null
          check_reference?: string | null
          cleared_date?: string | null
          client_id?: string | null
          commitment_ref?: string | null
          construction_division_id?: string | null
          cost_code_id?: string | null
          cost_phase?: string | null
          cost_type?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string
          expense_type?: string | null
          external_invoice_number?: string | null
          external_invoice_provider?: string | null
          external_invoice_url?: string | null
          external_reference?: string | null
          finance_client_id?: string | null
          fiscal_year?: number | null
          id?: string
          import_batch_id?: string | null
          internal_memo?: string | null
          invoice_id?: string | null
          location?: string | null
          markup_amount?: number
          milestone_id?: string | null
          net_amount?: number | null
          notes?: string | null
          original_transaction_id?: string | null
          paid_at?: string | null
          paid_date?: string | null
          parent_transaction_id?: string | null
          payment_method?: string | null
          payment_status?: string
          posting_date?: string | null
          processing_fee?: number
          project_id?: string | null
          project_phase_id?: string | null
          public_memo?: string | null
          purchase_order_ref?: string | null
          quantity?: number | null
          receipt_status?: string
          reconciled?: boolean
          reconciled_at?: string | null
          reconciliation_status?: string
          reimbursable_status?: string
          rejection_reason?: string | null
          retainage_amount?: number | null
          retainage_percent?: number | null
          scope_item_id?: string | null
          source_name?: string | null
          status?: string
          subcontractor_id?: string | null
          subcontractor_retainage_released?: number
          subcontractor_retainage_withheld?: number
          submitted_at?: string | null
          submitted_by?: string | null
          subtype?: string | null
          sync_status?: string
          tags?: string[]
          tax_amount?: number
          total_amount?: number | null
          transaction_date?: string
          transaction_number?: string | null
          type: Database["public"]["Enums"]["txn_type"]
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          vendor_bill_ref?: string | null
          vendor_id?: string | null
          work_completed_pct?: number | null
        }
        Update: {
          accounting_period?: string | null
          amount?: number
          amount_before_tax?: number | null
          approval_notes?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          attachment_count?: number
          bank_account_id?: string | null
          billable_amount?: number
          billable_status?: string
          budget_category?: string | null
          budget_line_item?: string | null
          category?: string | null
          change_order_id?: string | null
          check_reference?: string | null
          cleared_date?: string | null
          client_id?: string | null
          commitment_ref?: string | null
          construction_division_id?: string | null
          cost_code_id?: string | null
          cost_phase?: string | null
          cost_type?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string
          expense_type?: string | null
          external_invoice_number?: string | null
          external_invoice_provider?: string | null
          external_invoice_url?: string | null
          external_reference?: string | null
          finance_client_id?: string | null
          fiscal_year?: number | null
          id?: string
          import_batch_id?: string | null
          internal_memo?: string | null
          invoice_id?: string | null
          location?: string | null
          markup_amount?: number
          milestone_id?: string | null
          net_amount?: number | null
          notes?: string | null
          original_transaction_id?: string | null
          paid_at?: string | null
          paid_date?: string | null
          parent_transaction_id?: string | null
          payment_method?: string | null
          payment_status?: string
          posting_date?: string | null
          processing_fee?: number
          project_id?: string | null
          project_phase_id?: string | null
          public_memo?: string | null
          purchase_order_ref?: string | null
          quantity?: number | null
          receipt_status?: string
          reconciled?: boolean
          reconciled_at?: string | null
          reconciliation_status?: string
          reimbursable_status?: string
          rejection_reason?: string | null
          retainage_amount?: number | null
          retainage_percent?: number | null
          scope_item_id?: string | null
          source_name?: string | null
          status?: string
          subcontractor_id?: string | null
          subcontractor_retainage_released?: number
          subcontractor_retainage_withheld?: number
          submitted_at?: string | null
          submitted_by?: string | null
          subtype?: string | null
          sync_status?: string
          tags?: string[]
          tax_amount?: number
          total_amount?: number | null
          transaction_date?: string
          transaction_number?: string | null
          type?: Database["public"]["Enums"]["txn_type"]
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          vendor_bill_ref?: string | null
          vendor_id?: string | null
          work_completed_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "finance_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "project_change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_construction_division_id_fkey"
            columns: ["construction_division_id"]
            isOneToOne: false
            referencedRelation: "finance_construction_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "finance_cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_finance_client_id_fkey"
            columns: ["finance_client_id"]
            isOneToOne: false
            referencedRelation: "finance_client_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "finance_project_control_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_phase_id_fkey"
            columns: ["project_phase_id"]
            isOneToOne: false
            referencedRelation: "finance_project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_scope_item_id_fkey"
            columns: ["scope_item_id"]
            isOneToOne: false
            referencedRelation: "project_scope_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          current_payable_balance: number
          dba: string | null
          default_cost_code_id: string | null
          default_expense_category: string | null
          deleted_at: string | null
          ein: string | null
          entity_id: string
          id: string
          insurance_expiration: string | null
          is_subcontractor: boolean
          legal_name: string | null
          license_number: string | null
          lien_waiver_required: boolean
          name: string
          notes: string | null
          payment_terms: string | null
          remittance_address: string | null
          requires_1099: boolean
          retainage_payable: number
          tax_id_status: string | null
          updated_at: string
          user_id: string
          w9_on_file: boolean
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          current_payable_balance?: number
          dba?: string | null
          default_cost_code_id?: string | null
          default_expense_category?: string | null
          deleted_at?: string | null
          ein?: string | null
          entity_id?: string
          id?: string
          insurance_expiration?: string | null
          is_subcontractor?: boolean
          legal_name?: string | null
          license_number?: string | null
          lien_waiver_required?: boolean
          name: string
          notes?: string | null
          payment_terms?: string | null
          remittance_address?: string | null
          requires_1099?: boolean
          retainage_payable?: number
          tax_id_status?: string | null
          updated_at?: string
          user_id: string
          w9_on_file?: boolean
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          current_payable_balance?: number
          dba?: string | null
          default_cost_code_id?: string | null
          default_expense_category?: string | null
          deleted_at?: string | null
          ein?: string | null
          entity_id?: string
          id?: string
          insurance_expiration?: string | null
          is_subcontractor?: boolean
          legal_name?: string | null
          license_number?: string | null
          lien_waiver_required?: boolean
          name?: string
          notes?: string | null
          payment_terms?: string | null
          remittance_address?: string | null
          requires_1099?: boolean
          retainage_payable?: number
          tax_id_status?: string | null
          updated_at?: string
          user_id?: string
          w9_on_file?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "vendors_default_cost_code_id_fkey"
            columns: ["default_cost_code_id"]
            isOneToOne: false
            referencedRelation: "finance_cost_codes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      finance_project_control_summary: {
        Row: {
          actual_cost: number | null
          ap_retainage_held: number | null
          approved_change_orders: number | null
          ar_open: number | null
          ar_overdue: number | null
          ar_retainage_held: number | null
          budget: number | null
          committed_cost: number | null
          earned_revenue: number | null
          entity_id: string | null
          gross_margin: number | null
          gross_margin_pct: number | null
          open_draw_requests: number | null
          over_under_billed: number | null
          pending_change_orders: number | null
          percent_complete_cost: number | null
          project_id: string | null
          project_name: string | null
          project_status: Database["public"]["Enums"]["project_status"] | null
          rejected_change_orders: number | null
          remaining_commitment: number | null
          revised_contract_value: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_bank_match_suggestion: {
        Args: { p_suggestion_id: string }
        Returns: undefined
      }
      accounting_period_locked: {
        Args: { p_date: string; p_entity_id: string }
        Returns: boolean
      }
      approve_portal_client: { Args: { p_email: string }; Returns: undefined }
      can_manage_entity_roles: {
        Args: { p_entity_id: string }
        Returns: boolean
      }
      complete_document_ocr: {
        Args: { p_doc_id: string; p_extracted: Json; p_status?: string }
        Returns: undefined
      }
      consume_portal_invite: {
        Args: { p_client_id: string; p_token: string }
        Returns: boolean
      }
      create_hgp_emergency_job: {
        Args: { p_outage_event_id: string; p_site_id: string }
        Returns: string
      }
      create_portal_client: {
        Args: {
          p_email: string
          p_name: string
          p_password: string
          p_phone: string
          p_project_interest: string
          p_project_type: string
        }
        Returns: {
          approved_at: string | null
          created_at: string
          email: string
          id: string
          name: string
          password_hash: string | null
          phone: string | null
          project_interest: string | null
          project_type: string | null
          rejected_at: string | null
          status: Database["public"]["Enums"]["portal_client_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "portal_clients"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_procurement_rfq_from_open: {
        Args: {
          p_due_date?: string
          p_requirement_ids?: string[]
          p_title?: string
        }
        Returns: string
      }
      ensure_default_accounting_config: {
        Args: { p_entity_id?: string }
        Returns: string
      }
      finance_changelog_entity: {
        Args: { p_row: Json; p_table: string }
        Returns: string
      }
      finance_changelog_label: {
        Args: { p_row: Json; p_table: string }
        Returns: string
      }
      finance_invoice_total: {
        Args: { p_line_items: Json; p_tax_rate?: number }
        Returns: number
      }
      finance_next_number: {
        Args: { p_prefix: string; p_table: string }
        Returns: string
      }
      generate_bank_match_suggestions: {
        Args: { p_bank_activity_id: string }
        Returns: number
      }
      get_finance_aging_summary: {
        Args: { p_entity_id?: string }
        Returns: {
          aging_type: string
          bucket: string
          open_amount: number
        }[]
      }
      get_finance_client_account_summary: {
        Args: { p_entity_id: string }
        Returns: {
          city: string
          client_type: string
          company: string
          email: string
          id: string
          invoice_open_balance: number
          job_count: number
          last_visit_date: string
          lifetime_expense: number
          lifetime_income: number
          name: string
          next_visit_date: string
          phone: string
          project_name: string
          site_address: string
          status: string
          visit_count: number
          zip: string
        }[]
      }
      get_finance_control_summary: {
        Args: { p_entity_id?: string }
        Returns: {
          actual_cost: number | null
          ap_retainage_held: number | null
          approved_change_orders: number | null
          ar_open: number | null
          ar_overdue: number | null
          ar_retainage_held: number | null
          budget: number | null
          committed_cost: number | null
          earned_revenue: number | null
          entity_id: string | null
          gross_margin: number | null
          gross_margin_pct: number | null
          open_draw_requests: number | null
          over_under_billed: number | null
          pending_change_orders: number | null
          percent_complete_cost: number | null
          project_id: string | null
          project_name: string | null
          project_status: Database["public"]["Enums"]["project_status"] | null
          rejected_change_orders: number | null
          remaining_commitment: number | null
          revised_contract_value: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "finance_project_control_summary"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_fixed_asset_depreciation_schedule: {
        Args: { p_asset_id: string }
        Returns: {
          accumulated_depreciation: number
          book_value_end: number
          book_value_start: number
          depreciation_expense: number
          months_in_service: number
          period_year: number
        }[]
      }
      get_fixed_assets_register: {
        Args: { p_entity_id?: string }
        Returns: {
          accumulated_depreciation: number
          acquisition_date: string
          asset_category: string
          asset_name: string
          asset_tag: string
          cost_basis: number
          depreciation_method: string
          disposal_amount: number
          disposal_date: string
          id: string
          net_book_value: number
          notes: string
          placed_in_service_date: string
          project_id: string
          project_name: string
          salvage_value: number
          status: string
          useful_life_years: number
          vendor_id: string
          vendor_name: string
        }[]
      }
      get_hgp_finance_summary: {
        Args: never
        Returns: {
          deposits_held: number
          emergency_revenue: number
          inventory_value: number
          recurring_annual_value: number
          service_revenue: number
          total_expense: number
          total_income: number
        }[]
      }
      get_hgp_inventory_position: {
        Args: never
        Returns: {
          consumed_30d: number
          low_stock_count: number
          part_skus: number
          parts_value: number
          units_on_hand: number
          units_value: number
        }[]
      }
      get_holdings_balance_sheet: {
        Args: { p_entity_id?: string }
        Returns: {
          active_notes_payable_count: number
          active_notes_receivable_count: number
          as_of_date: string
          capital_contributions_itd: number
          cash_position: number
          distributions_itd: number
          dividends_itd: number
          intercompany_transfers_itd: number
          management_fees_itd: number
          notes_payable: number
          notes_receivable: number
          owners_equity: number
          tax_reserves_itd: number
          total_assets: number
          total_liabilities: number
        }[]
      }
      get_holdings_entity_performance: {
        Args: never
        Returns: {
          cleared_checks: number
          entity_id: string
          expense: number
          income: number
        }[]
      }
      get_holdings_note_amortization: {
        Args: { p_max_periods?: number; p_note_id: string }
        Returns: {
          due_date: string
          ending_balance: number
          interest: number
          payment: number
          period: number
          principal: number
        }[]
      }
      get_ledger_page: {
        Args: {
          p_entity_id?: string
          p_limit?: number
          p_offset?: number
          p_project_id?: string
          p_search?: string
          p_type?: string
        }
        Returns: {
          amount: number
          cleared_date: string
          context_kind: string
          context_label: string
          counterparty: string
          entity_id: string
          ledger_date: string
          ledger_type: string
          project_id: string
          project_name: string
          reconciled: boolean
          reconciliation_status: string
          reference: string
          row_kind: string
          source_id: string
          status: string
          total_count: number
        }[]
      }
      get_portal_client_by_email: {
        Args: { p_email: string }
        Returns: {
          email: string
          id: string
          name: string
        }[]
      }
      get_portal_client_by_id: {
        Args: { p_id: string }
        Returns: {
          approved_at: string | null
          created_at: string
          email: string
          id: string
          name: string
          password_hash: string | null
          phone: string | null
          project_interest: string | null
          project_type: string | null
          rejected_at: string | null
          status: Database["public"]["Enums"]["portal_client_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "portal_clients"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_portal_project_data: {
        Args: { p_client_id: string }
        Returns: {
          address: string
          city: string
          contract_amount: number
          description: string
          estimated_completion: string
          milestones: Json
          progress_pct: number
          project_id: string
          project_manager: string
          start_date: string
          state: string
          status: string
          superintendent: string
          title: string
          type: string
          updates: Json
        }[]
      }
      get_procurement_hedge_summary: {
        Args: { p_entity_id?: string }
        Returns: {
          avg_target_unit_price: number
          best_quote_captured_at: string
          best_supplier_name: string
          best_unit_price: number
          category: string
          display_material: string
          earliest_required_by: string
          estimated_cost: number
          estimated_savings: number
          normalized_material: string
          open_quantity: number
          project_count: number
          requirement_count: number
          unit: string
        }[]
      }
      get_project_financial_summary: {
        Args: { p_project_id: string }
        Returns: {
          accounts_receivable: number
          actual_gross_margin: number
          actual_gross_profit: number
          actual_project_costs: number
          approved_change_orders: number
          cash_position: number
          committed_project_costs: number
          current_contract_value: number
          estimated_cost_to_complete: number
          estimated_final_cost: number
          estimated_gross_margin: number
          estimated_gross_profit: number
          original_contract_value: number
          outstanding_checks: number
          paid_costs: number
          percentage_billed: number
          percentage_collected: number
          project_id: string
          projects_over_budget: boolean
          remaining_budget: number
          retainage_released: number
          retainage_withheld: number
          total_collected: number
          total_invoiced: number
          unbilled_contract_amount: number
          unpaid_costs: number
        }[]
      }
      invoice_total_amount: {
        Args: { p_line_items: Json; p_tax_rate?: number }
        Returns: number
      }
      is_help_support_admin: { Args: never; Returns: boolean }
      log_portal_changelog: {
        Args: {
          p_action: string
          p_changed_by?: string
          p_details?: Json
          p_entity: string
          p_entity_id?: string
          p_entity_label?: string
        }
        Returns: string
      }
      map_admin_status_to_finance: {
        Args: { s: string }
        Returns: Database["public"]["Enums"]["project_status"]
      }
      match_hgp_outage_impacts: {
        Args: { p_outage_event_id: string }
        Returns: number
      }
      post_check_to_ledger: { Args: { p_check_id: string }; Returns: string }
      post_transaction_to_ledger: {
        Args: { p_transaction_id: string }
        Returns: string
      }
      resolve_portal_help_request: {
        Args: {
          p_request_id: string
          p_resolution_note?: string
          p_resolver_name: string
        }
        Returns: undefined
      }
      reverse_journal_entry: {
        Args: { p_journal_entry_id: string; p_reason?: string }
        Returns: string
      }
      set_accounting_period_status: {
        Args: {
          p_entity_id: string
          p_notes?: string
          p_period_key: string
          p_status: string
        }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          entity_id: string
          id: string
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          period_key: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "accounting_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_portal_password: {
        Args: { p_id: string; p_password: string }
        Returns: undefined
      }
      submit_portal_help_request: {
        Args: {
          p_client_id: string
          p_message: string
          p_project_id: string
          p_project_title: string
          p_subject: string
        }
        Returns: Json
      }
      transition_inbound_lead: {
        Args: { p_lead_id: string; p_source: string; p_status: string }
        Returns: Json
      }
      user_has_entity_role: {
        Args: { p_entity_id: string; p_roles: string[] }
        Returns: boolean
      }
      validate_portal_invite: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          is_valid: boolean
          name: string
          project_id: string
          project_title: string
          token: string
        }[]
      }
      verify_accounting_period_close: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_admin_help_requests: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_dispatch_capital_approvals: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_entity_client_accounts: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_entity_finance_depth2: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_entity_finance_summaries: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_entity_operations_depth: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_finance_client_portal_separation: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_finance_launch_migrations: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_fixed_assets_depreciation: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_he_procurement_hedge_engine: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_hgp_command_map: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_hgp_field_ops: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_hgp_inventory: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_hgp_job_payments: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_hgp_procurement_scheduling: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_holdings_balance_sheet: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_holdings_covenants: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_invoice_intelligence_job_link: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_ledger_entity_context: {
        Args: never
        Returns: {
          check_name: string
          details: string
          ok: boolean
        }[]
      }
      verify_portal_password: {
        Args: { p_email: string; p_password: string }
        Returns: {
          approved_at: string | null
          created_at: string
          email: string
          id: string
          name: string
          password_hash: string | null
          phone: string | null
          project_interest: string | null
          project_type: string | null
          rejected_at: string | null
          status: Database["public"]["Enums"]["portal_client_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "portal_clients"
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
      brief_status:
        | "draft"
        | "submitted"
        | "reviewing"
        | "consultation_scheduled"
        | "in_progress"
      check_status: "pending" | "cleared" | "voided"
      doc_category: "required" | "uploaded" | "contract" | "report"
      doc_status: "pending" | "uploaded" | "approved" | "rejected"
      meeting_format: "In-Person" | "Video Call" | "Phone Call"
      meeting_status: "requested" | "confirmed" | "completed" | "cancelled"
      message_sender: "client" | "builder"
      portal_client_status: "pending_approval" | "approved" | "rejected"
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
  graphql_public: {
    Enums: {},
  },
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
      brief_status: [
        "draft",
        "submitted",
        "reviewing",
        "consultation_scheduled",
        "in_progress",
      ],
      check_status: ["pending", "cleared", "voided"],
      doc_category: ["required", "uploaded", "contract", "report"],
      doc_status: ["pending", "uploaded", "approved", "rejected"],
      meeting_format: ["In-Person", "Video Call", "Phone Call"],
      meeting_status: ["requested", "confirmed", "completed", "cancelled"],
      message_sender: ["client", "builder"],
      portal_client_status: ["pending_approval", "approved", "rejected"],
      project_status: ["active", "on_hold", "completed", "archived"],
      txn_type: ["income", "expense"],
    },
  },
} as const
