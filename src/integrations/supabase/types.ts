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
          description: string | null
          entity: string
          estimated_completion: string | null
          id: string
          internal_notes: string | null
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
          description?: string | null
          entity?: string
          estimated_completion?: string | null
          id?: string
          internal_notes?: string | null
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
          description?: string | null
          entity?: string
          estimated_completion?: string | null
          id?: string
          internal_notes?: string | null
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
            foreignKeyName: "admin_projects_portal_client_id_fkey"
            columns: ["portal_client_id"]
            isOneToOne: false
            referencedRelation: "portal_clients"
            referencedColumns: ["id"]
          },
        ]
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
          entity_id: string
          external_reference: string | null
          id: string
          issue_date: string
          lien_waiver_status: string
          memo: string | null
          milestone_id: string | null
          original_check_id: string | null
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
          entity_id?: string
          external_reference?: string | null
          id?: string
          issue_date?: string
          lien_waiver_status?: string
          memo?: string | null
          milestone_id?: string | null
          original_check_id?: string | null
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
          entity_id?: string
          external_reference?: string | null
          id?: string
          issue_date?: string
          lien_waiver_status?: string
          memo?: string | null
          milestone_id?: string | null
          original_check_id?: string | null
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
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          service_type: string | null
        }
        Insert: {
          budget_range?: string | null
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          service_type?: string | null
        }
        Update: {
          budget_range?: string | null
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          service_type?: string | null
        }
        Relationships: []
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
          created_at: string
          draw_amount: number
          id: string
          milestone_name: string
          notes: string | null
          project_id: string
          scheduled_date: string | null
          status: string
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
        }
        Relationships: [
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
      invoices: {
        Row: {
          amount_paid: number
          client_address: string
          client_company: string
          client_email: string
          client_id: string | null
          client_name: string
          created_at: string
          due_date: string
          entity_id: string
          id: string
          internal_memo: string | null
          invoice_number: string
          issue_date: string
          line_items: Json
          notes: string
          payment_terms: string | null
          project_id: string | null
          public_memo: string | null
          retainage_held: number | null
          retainage_pct: number | null
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
          created_at?: string
          due_date?: string
          entity_id?: string
          id?: string
          internal_memo?: string | null
          invoice_number: string
          issue_date?: string
          line_items?: Json
          notes?: string
          payment_terms?: string | null
          project_id?: string | null
          public_memo?: string | null
          retainage_held?: number | null
          retainage_pct?: number | null
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
          created_at?: string
          due_date?: string
          entity_id?: string
          id?: string
          internal_memo?: string | null
          invoice_number?: string
          issue_date?: string
          line_items?: Json
          notes?: string
          payment_terms?: string | null
          project_id?: string | null
          public_memo?: string | null
          retainage_held?: number | null
          retainage_pct?: number | null
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
            isOneToOne: true
            referencedRelation: "portal_clients"
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
          client_id: string
          created_at: string
          description: string | null
          file_size: string | null
          file_type: string
          file_url: string | null
          id: string
          name: string
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
          client_id: string
          created_at?: string
          description?: string | null
          file_size?: string | null
          file_type: string
          file_url?: string | null
          id?: string
          name: string
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
          client_id?: string
          created_at?: string
          description?: string | null
          file_size?: string | null
          file_type?: string
          file_url?: string | null
          id?: string
          name?: string
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
      project_change_orders: {
        Row: {
          amount: number
          approved_date: string | null
          co_number: string | null
          created_at: string
          description: string | null
          entity_id: string
          id: string
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
          approved_date?: string | null
          co_number?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string
          id?: string
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
          approved_date?: string | null
          co_number?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string
          id?: string
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
          admin_notes: string | null
          client_id: string
          completed_date: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          phase_description: string | null
          phase_index: number
          phase_name: string | null
          sort_order: number | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          client_id: string
          completed_date?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phase_description?: string | null
          phase_index: number
          phase_name?: string | null
          sort_order?: number | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          client_id?: string
          completed_date?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phase_description?: string | null
          phase_index?: number
          phase_name?: string | null
          sort_order?: number | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_photos: {
        Row: {
          caption: string | null
          client_id: string
          file_url: string
          id: string
          phase: string | null
          project_id: string | null
          storage_path: string
          taken_at: string | null
          uploaded_at: string
        }
        Insert: {
          caption?: string | null
          client_id: string
          file_url: string
          id?: string
          phase?: string | null
          project_id?: string | null
          storage_path: string
          taken_at?: string | null
          uploaded_at?: string
        }
        Update: {
          caption?: string | null
          client_id?: string
          file_url?: string
          id?: string
          phase?: string | null
          project_id?: string | null
          storage_path?: string
          taken_at?: string | null
          uploaded_at?: string
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_scope_items: {
        Row: {
          category: string | null
          change_order_amount: number
          contract_amount: number
          cost_code: string | null
          created_at: string
          entity_id: string
          id: string
          name: string
          notes: string | null
          percent_complete: number
          project_id: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          change_order_amount?: number
          contract_amount?: number
          cost_code?: string | null
          created_at?: string
          entity_id?: string
          id?: string
          name: string
          notes?: string | null
          percent_complete?: number
          project_id: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          change_order_amount?: number
          contract_amount?: number
          cost_code?: string | null
          created_at?: string
          entity_id?: string
          id?: string
          name?: string
          notes?: string | null
          percent_complete?: number
          project_id?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          budget: number
          client_name_snapshot: string | null
          code: string | null
          created_at: string
          current_contract_value: number
          deleted_at: string | null
          department: string | null
          entity_id: string
          estimated_cost_to_complete: number
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
          budget?: number
          client_name_snapshot?: string | null
          code?: string | null
          created_at?: string
          current_contract_value?: number
          deleted_at?: string | null
          department?: string | null
          entity_id?: string
          estimated_cost_to_complete?: number
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
          budget?: number
          client_name_snapshot?: string | null
          code?: string | null
          created_at?: string
          current_contract_value?: number
          deleted_at?: string | null
          department?: string | null
          entity_id?: string
          estimated_cost_to_complete?: number
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
          description: string | null
          email: string
          id: string
          location: string | null
          name: string
          phone: string | null
          priorities: string[] | null
          scope: string | null
          source: string
          sqft: string | null
          start_timeline: string | null
          submitted_at: string
          type: string | null
        }
        Insert: {
          budget?: string | null
          description?: string | null
          email: string
          id?: string
          location?: string | null
          name: string
          phone?: string | null
          priorities?: string[] | null
          scope?: string | null
          source?: string
          sqft?: string | null
          start_timeline?: string | null
          submitted_at?: string
          type?: string | null
        }
        Update: {
          budget?: string | null
          description?: string | null
          email?: string
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          priorities?: string[] | null
          scope?: string | null
          source?: string
          sqft?: string | null
          start_timeline?: string | null
          submitted_at?: string
          type?: string | null
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
          external_reference: string | null
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
          external_reference?: string | null
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
          external_reference?: string | null
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
      [_ in never]: never
    }
    Functions: {
      approve_portal_client: { Args: { p_email: string }; Returns: undefined }
      complete_document_ocr: {
        Args: { p_doc_id: string; p_extracted: Json; p_status?: string }
        Returns: undefined
      }
      consume_portal_invite: {
        Args: { p_client_id: string; p_token: string }
        Returns: boolean
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
