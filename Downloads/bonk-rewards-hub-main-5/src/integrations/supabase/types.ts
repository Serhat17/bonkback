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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          processed_at: string | null
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          processed_at?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_networks: {
        Row: {
          created_at: string
          default_affiliate_id: string | null
          default_program_id: string | null
          display_name: string | null
          encoding_rules: Json
          id: string
          network: string
          tracking_url_template: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_affiliate_id?: string | null
          default_program_id?: string | null
          display_name?: string | null
          encoding_rules?: Json
          id?: string
          network: string
          tracking_url_template: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_affiliate_id?: string | null
          default_program_id?: string | null
          display_name?: string | null
          encoding_rules?: Json
          id?: string
          network?: string
          tracking_url_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      auth_audit_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          featured: boolean | null
          id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          featured?: boolean | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          featured?: boolean | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bonk_locks: {
        Row: {
          amount_bonk: number
          id: string
          locked_at: string
          reason: string | null
          unlock_at: string | null
          unlocked_by: string | null
          user_id: string
        }
        Insert: {
          amount_bonk: number
          id?: string
          locked_at?: string
          reason?: string | null
          unlock_at?: string | null
          unlocked_by?: string | null
          user_id: string
        }
        Update: {
          amount_bonk?: number
          id?: string
          locked_at?: string
          reason?: string | null
          unlock_at?: string | null
          unlocked_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bonk_payout_events: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          source: string
          transfer_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          source: string
          transfer_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          source?: string
          transfer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonk_payout_events_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "bonk_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      bonk_transfers: {
        Row: {
          amount: number
          created_at: string
          error_message: string | null
          id: string
          retry_count: number | null
          security_metadata: Json | null
          source_id: string | null
          source_type: string
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount: number
          created_at?: string
          error_message?: string | null
          id?: string
          retry_count?: number | null
          security_metadata?: Json | null
          source_id?: string | null
          source_type: string
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          amount?: number
          created_at?: string
          error_message?: string | null
          id?: string
          retry_count?: number | null
          security_metadata?: Json | null
          source_id?: string | null
          source_type?: string
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      cashback_offers: {
        Row: {
          affiliate_id: string | null
          affiliate_network: string | null
          cashback_percentage: number
          category: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          deeplink: string | null
          description: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          max_cashback: number | null
          merchant_logo_url: string | null
          merchant_name: string
          program_id: string | null
          status: Database["public"]["Enums"]["offer_status"] | null
          terms_conditions: string | null
          title: string
          tracking_template: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          affiliate_id?: string | null
          affiliate_network?: string | null
          cashback_percentage: number
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deeplink?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          max_cashback?: number | null
          merchant_logo_url?: string | null
          merchant_name: string
          program_id?: string | null
          status?: Database["public"]["Enums"]["offer_status"] | null
          terms_conditions?: string | null
          title: string
          tracking_template?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          affiliate_id?: string | null
          affiliate_network?: string | null
          cashback_percentage?: number
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deeplink?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          max_cashback?: number | null
          merchant_logo_url?: string | null
          merchant_name?: string
          program_id?: string | null
          status?: Database["public"]["Enums"]["offer_status"] | null
          terms_conditions?: string | null
          title?: string
          tracking_template?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashback_offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_offers_network"
            columns: ["affiliate_network"]
            isOneToOne: false
            referencedRelation: "affiliate_networks"
            referencedColumns: ["network"]
          },
        ]
      }
      cashback_policy: {
        Row: {
          deferred_release_delay_days: number
          id: boolean
          immediate_release_percent: number
          updated_at: string | null
        }
        Insert: {
          deferred_release_delay_days?: number
          id?: boolean
          immediate_release_percent?: number
          updated_at?: string | null
        }
        Update: {
          deferred_release_delay_days?: number
          id?: boolean
          immediate_release_percent?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      cashback_transactions: {
        Row: {
          affiliate_id: string | null
          approved_date: string | null
          available_from_deferred: string | null
          available_from_immediate: string | null
          bonk_amount: number
          cashback_amount: number
          category_id: string | null
          created_at: string | null
          deferred_amount: number | null
          id: string
          immediate_amount: number | null
          is_returned: boolean | null
          metadata: Json | null
          offer_id: string
          order_id: string | null
          paid_date: string | null
          purchase_amount: number
          purchase_date: string | null
          purchase_url: string | null
          return_window_ends_at: string | null
          status: Database["public"]["Enums"]["cashback_status"] | null
          total_cashback: number | null
          transaction_hash: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          affiliate_id?: string | null
          approved_date?: string | null
          available_from_deferred?: string | null
          available_from_immediate?: string | null
          bonk_amount: number
          cashback_amount: number
          category_id?: string | null
          created_at?: string | null
          deferred_amount?: number | null
          id?: string
          immediate_amount?: number | null
          is_returned?: boolean | null
          metadata?: Json | null
          offer_id: string
          order_id?: string | null
          paid_date?: string | null
          purchase_amount: number
          purchase_date?: string | null
          purchase_url?: string | null
          return_window_ends_at?: string | null
          status?: Database["public"]["Enums"]["cashback_status"] | null
          total_cashback?: number | null
          transaction_hash?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          affiliate_id?: string | null
          approved_date?: string | null
          available_from_deferred?: string | null
          available_from_immediate?: string | null
          bonk_amount?: number
          cashback_amount?: number
          category_id?: string | null
          created_at?: string | null
          deferred_amount?: number | null
          id?: string
          immediate_amount?: number | null
          is_returned?: boolean | null
          metadata?: Json | null
          offer_id?: string
          order_id?: string | null
          paid_date?: string | null
          purchase_amount?: number
          purchase_date?: string | null
          purchase_url?: string | null
          return_window_ends_at?: string | null
          status?: Database["public"]["Enums"]["cashback_status"] | null
          total_cashback?: number | null
          transaction_hash?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashback_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashback_transactions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "cashback_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cashback_transactions_offer_id"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "cashback_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          return_window_days: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          return_window_days?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          return_window_days?: number
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          consent_given: boolean
          consent_type: string
          consent_version: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          consent_given: boolean
          consent_type: string
          consent_version: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          consent_given?: boolean
          consent_type?: string
          consent_version?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          created_at: string | null
          data_categories: string[] | null
          downloaded_at: string | null
          expires_at: string | null
          export_format: string
          file_path: string | null
          file_size: number | null
          id: string
          processed_at: string | null
          request_type: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_categories?: string[] | null
          downloaded_at?: string | null
          expires_at?: string | null
          export_format?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          processed_at?: string | null
          request_type?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_categories?: string[] | null
          downloaded_at?: string | null
          expires_at?: string | null
          export_format?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          processed_at?: string | null
          request_type?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      deleted_users_log: {
        Row: {
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          reason: string | null
          updated_at: string | null
        }
        Insert: {
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          reason?: string | null
          updated_at?: string | null
        }
        Update: {
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          reason?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string | null
          html_content: string
          id: string
          max_attempts: number | null
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          template_name: string
          text_content: string | null
          updated_at: string | null
          user_id: string | null
          variables: Json | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          html_content: string
          id?: string
          max_attempts?: number | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
          template_name: string
          text_content?: string | null
          updated_at?: string | null
          user_id?: string | null
          variables?: Json | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          html_content?: string
          id?: string
          max_attempts?: number | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template_name?: string
          text_content?: string | null
          updated_at?: string | null
          user_id?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string | null
          html_template: string
          id: string
          is_active: boolean | null
          name: string
          subject_template: string
          text_template: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          html_template: string
          id?: string
          is_active?: boolean | null
          name: string
          subject_template: string
          text_template?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          html_template?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject_template?: string
          text_template?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          additional_data: Json | null
          component: string | null
          created_at: string
          error_message: string
          id: string
          resolved: boolean
          severity: string
          stack_trace: string | null
          updated_at: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          additional_data?: Json | null
          component?: string | null
          created_at?: string
          error_message: string
          id?: string
          resolved?: boolean
          severity?: string
          stack_trace?: string | null
          updated_at?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          additional_data?: Json | null
          component?: string | null
          created_at?: string
          error_message?: string
          id?: string
          resolved?: boolean
          severity?: string
          stack_trace?: string | null
          updated_at?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      gift_card_redemptions: {
        Row: {
          bonk_amount: number
          created_at: string | null
          gift_card_id: string
          id: string
          redeemed_at: string | null
          redemption_code: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bonk_amount: number
          created_at?: string | null
          gift_card_id: string
          id?: string
          redeemed_at?: string | null
          redemption_code?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bonk_amount?: number
          created_at?: string | null
          gift_card_id?: string
          id?: string
          redeemed_at?: string | null
          redemption_code?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_gift_card_redemptions_gift_card_id"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_redemptions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          available_quantity: number | null
          bonk_price: number
          brand_logo_url: string | null
          brand_name: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          fiat_value: number
          id: string
          status: Database["public"]["Enums"]["offer_status"] | null
          terms_conditions: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          available_quantity?: number | null
          bonk_price: number
          brand_logo_url?: string | null
          brand_name: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          fiat_value: number
          id?: string
          status?: Database["public"]["Enums"]["offer_status"] | null
          terms_conditions?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          available_quantity?: number | null
          bonk_price?: number
          brand_logo_url?: string | null
          brand_name?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          fiat_value?: number
          id?: string
          status?: Database["public"]["Enums"]["offer_status"] | null
          terms_conditions?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      offer_clicks: {
        Row: {
          click_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          offer_id: string
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          click_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          offer_id: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          click_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          offer_id?: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_clicks_offer"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "cashback_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_clicks_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payout_rate_limits: {
        Row: {
          created_at: string
          id: string
          last_payout_at: string
          payout_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_payout_at?: string
          payout_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_payout_at?: string
          payout_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string | null
          id: string
          processed_at: string | null
          requested_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string | null
          id?: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bonk_balance: number | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          referral_code: string | null
          referred_by: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          total_earned: number | null
          updated_at: string | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          bonk_balance?: number | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          referral_code?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          total_earned?: number | null
          updated_at?: string | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          bonk_balance?: number | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          referral_code?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          total_earned?: number | null
          updated_at?: string | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          count: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          action_type: string
          count?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          window_start?: string
        }
        Update: {
          action_type?: string
          count?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      referral_payouts: {
        Row: {
          amount: number
          beneficiary_id: string
          created_at: string
          id: string
          referred_user_id: string
          referrer_id: string
          required_threshold: number
          status: string
          unlocked_at: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          beneficiary_id: string
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_id: string
          required_threshold: number
          status?: string
          unlocked_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          beneficiary_id?: string
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
          required_threshold?: number
          status?: string
          unlocked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_payouts_beneficiary"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_payouts_referred"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_payouts_referrer"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referral_tracking: {
        Row: {
          conversion_date: string | null
          converted_user_id: string | null
          created_at: string
          device_fingerprint: string
          expires_at: string | null
          id: string
          ip_address: unknown | null
          landing_page: string | null
          referral_code: string
          referrer_id: string
          session_id: string | null
          tracked_user_id: string | null
          updated_at: string
          user_agent: string | null
          utm_params: Json | null
        }
        Insert: {
          conversion_date?: string | null
          converted_user_id?: string | null
          created_at?: string
          device_fingerprint: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown | null
          landing_page?: string | null
          referral_code: string
          referrer_id: string
          session_id?: string | null
          tracked_user_id?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_params?: Json | null
        }
        Update: {
          conversion_date?: string | null
          converted_user_id?: string | null
          created_at?: string
          device_fingerprint?: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown | null
          landing_page?: string | null
          referral_code?: string
          referrer_id?: string
          session_id?: string | null
          tracked_user_id?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_params?: Json | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referred_user_claimed: boolean | null
          referrer_id: string
          reward_claimed: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referred_user_claimed?: boolean | null
          referrer_id: string
          reward_claimed?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referred_user_claimed?: boolean | null
          referrer_id?: string
          reward_claimed?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      role_change_audit: {
        Row: {
          changed_by: string
          created_at: string | null
          id: string
          new_role: string
          old_role: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string | null
          id?: string
          new_role: string
          old_role?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string | null
          id?: string
          new_role?: string
          old_role?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          severity: string | null
          source: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string | null
          source: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string | null
          source?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      session_timeouts: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_activity_at: string | null
          session_started_at: string | null
          timeout_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          session_started_at?: string | null
          timeout_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          session_started_at?: string | null
          timeout_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      solana_key_vault: {
        Row: {
          created_at: string | null
          encrypted_derivation_path: string | null
          id: string
          is_active: boolean
          last_rotation: string | null
          rotated_at: string | null
          rotation_reason: string | null
          user_id: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          encrypted_derivation_path?: string | null
          id?: string
          is_active?: boolean
          last_rotation?: string | null
          rotated_at?: string | null
          rotation_reason?: string | null
          user_id?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          encrypted_derivation_path?: string | null
          id?: string
          is_active?: boolean
          last_rotation?: string | null
          rotated_at?: string | null
          rotation_reason?: string | null
          user_id?: string | null
          version?: number
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          is_internal: boolean | null
          message: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          description: string
          id: string
          metadata: Json | null
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          description: string
          id?: string
          metadata?: Json | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tax_reports: {
        Row: {
          country_code: string
          created_at: string | null
          file_path: string | null
          generated_at: string | null
          id: string
          report_data: Json | null
          report_type: string
          status: string
          tax_year: number
          taxable_amount_eur: number | null
          total_cashback_eur: number | null
          total_referral_eur: number | null
          total_withdrawals_eur: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          country_code?: string
          created_at?: string | null
          file_path?: string | null
          generated_at?: string | null
          id?: string
          report_data?: Json | null
          report_type?: string
          status?: string
          tax_year: number
          taxable_amount_eur?: number | null
          total_cashback_eur?: number | null
          total_referral_eur?: number | null
          total_withdrawals_eur?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          country_code?: string
          created_at?: string | null
          file_path?: string | null
          generated_at?: string | null
          id?: string
          report_data?: Json | null
          report_type?: string
          status?: string
          tax_year?: number
          taxable_amount_eur?: number | null
          total_cashback_eur?: number | null
          total_referral_eur?: number | null
          total_withdrawals_eur?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tax_transactions: {
        Row: {
          amount_bonk: number
          amount_eur: number
          created_at: string | null
          exchange_rate: number
          id: string
          metadata: Json | null
          source_transaction_id: string | null
          tax_year: number
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount_bonk: number
          amount_eur: number
          created_at?: string | null
          exchange_rate: number
          id?: string
          metadata?: Json | null
          source_transaction_id?: string | null
          tax_year: number
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount_bonk?: number
          amount_eur?: number
          created_at?: string | null
          exchange_rate?: number
          id?: string
          metadata?: Json | null
          source_transaction_id?: string | null
          tax_year?: number
          transaction_date?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      transfer_approval_requests: {
        Row: {
          amount: number
          approved_at: string | null
          created_at: string | null
          current_signatures: number
          expires_at: string | null
          id: string
          rejected_at: string | null
          required_signatures: number
          status: string
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          created_at?: string | null
          current_signatures?: number
          expires_at?: string | null
          id?: string
          rejected_at?: string | null
          required_signatures?: number
          status?: string
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          created_at?: string | null
          current_signatures?: number
          expires_at?: string | null
          id?: string
          rejected_at?: string | null
          required_signatures?: number
          status?: string
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      transfer_approvals: {
        Row: {
          amount: number
          approver_id: string | null
          approver_role: string
          created_at: string | null
          expires_at: string | null
          id: string
          signature: string
          status: string
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          amount: number
          approver_id?: string | null
          approver_role: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          signature: string
          status?: string
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          amount?: number
          approver_id?: string | null
          approver_role?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          signature?: string
          status?: string
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_wallet_activity: {
        Row: {
          amount_bonk: number | null
          amount_fiat_est: number | null
          happened_at: string | null
          meta: Json | null
          source: string | null
          status: string | null
          type: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_change_user_role: {
        Args: { new_role: string; reason?: string; target_user_id: string }
        Returns: Json
      }
      admin_get_secure_profile: {
        Args: { target_user_id: string }
        Returns: {
          bonk_balance: number
          created_at: string
          deleted_at: string
          email: string
          full_name: string
          id: string
          referral_code: string
          referred_by: string
          role: string
          total_earned: number
          updated_at: string
          user_id: string
          wallet_address: string
        }[]
      }
      admin_get_user_wallet_activity: {
        Args: { target_user_id: string }
        Returns: {
          amount_bonk: number
          amount_fiat_est: number
          happened_at: string
          meta: Json
          source: string
          status: string
          type: string
          user_id: string
        }[]
      }
      admin_get_user_wallet_balances: {
        Args: { target_user_id: string }
        Returns: {
          bonk_available: number
          bonk_balance_total: number
          bonk_locked: number
          user_id: string
        }[]
      }
      admin_rotate_user_key: {
        Args: { reason?: string; target_user_id: string }
        Returns: Json
      }
      build_tracking_url: {
        Args: {
          p_affiliate_id: string
          p_click_id: string
          p_deeplink: string
          p_network: string
          p_offer_id: string
          p_program_id: string
          p_user_id: string
        }
        Returns: string
      }
      calculate_bonk_amount: {
        Args: { p_bonk_price_usd?: number; p_cashback_amount: number }
        Returns: number
      }
      calculate_german_tax_liability: {
        Args: { tax_year: number; user_id: string }
        Returns: number
      }
      cancel_account_deletion: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      check_gift_card_redemption_eligibility: {
        Args: { _bonk_amount: number; _user_id: string }
        Returns: Json
      }
      check_payout_eligibility: {
        Args: { _amount: number; _user_id: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          _action_type: string
          _max_count?: number
          _user_id: string
          _window_minutes?: number
        }
        Returns: Json
      }
      check_session_timeout: {
        Args: { p_timeout_minutes?: number; p_user_id: string }
        Returns: boolean
      }
      claim_my_referral: {
        Args: { p_referral_code?: string }
        Returns: Json
      }
      debug_referral_status: {
        Args: { p_user_id?: string }
        Returns: Json
      }
      decrypt_derivation_path: {
        Args: { encrypted_path: string; user_id: string }
        Returns: string
      }
      delete_user_account: {
        Args: { target_user_id: string }
        Returns: Json
      }
      delete_user_account_enhanced: {
        Args: { target_user_id: string }
        Returns: Json
      }
      encrypt_derivation_path: {
        Args: { path: string; user_id: string }
        Returns: string
      }
      fix_existing_referral_rewards: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fix_my_referral_rewards: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      generate_blog_slug: {
        Args: { title: string }
        Returns: string
      }
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_available_cashback: {
        Args: { target_user_id?: string }
        Returns: {
          approved_date: string
          available_amount: number
          available_from_deferred: string
          available_from_immediate: string
          bonk_amount: number
          cashback_amount: number
          category_id: string
          created_at: string
          deferred_amount: number
          id: string
          immediate_amount: number
          is_returned: boolean
          metadata: Json
          offer_id: string
          paid_date: string
          purchase_amount: number
          purchase_date: string
          return_window_ends_at: string
          status: Database["public"]["Enums"]["cashback_status"]
          total_cashback: number
          transaction_hash: string
          updated_at: string
          user_id: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_key_vault_info: {
        Args: { target_user_id?: string }
        Returns: {
          is_active: boolean
          last_rotation: string
          needs_rotation: boolean
          user_id: string
          version: number
        }[]
      }
      get_my_available_cashback: {
        Args: Record<PropertyKey, never>
        Returns: {
          approved_date: string
          available_amount: number
          available_from_deferred: string
          available_from_immediate: string
          bonk_amount: number
          cashback_amount: number
          category_id: string
          created_at: string
          deferred_amount: number
          id: string
          immediate_amount: number
          is_returned: boolean
          metadata: Json
          offer_id: string
          paid_date: string
          purchase_amount: number
          purchase_date: string
          return_window_ends_at: string
          status: Database["public"]["Enums"]["cashback_status"]
          total_cashback: number
          transaction_hash: string
          updated_at: string
          user_id: string
        }[]
      }
      get_my_secure_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          bonk_balance: number
          created_at: string
          deleted_at: string
          email: string
          full_name: string
          id: string
          referral_code: string
          referred_by: string
          role: string
          total_earned: number
          updated_at: string
          user_id: string
          wallet_address: string
        }[]
      }
      get_my_wallet_activity: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount_bonk: number | null
          amount_fiat_est: number | null
          happened_at: string | null
          meta: Json | null
          source: string | null
          status: string | null
          type: string | null
          user_id: string | null
        }[]
      }
      get_my_wallet_activity_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount_bonk: number
          amount_fiat_est: number
          happened_at: string
          meta: Json
          source: string
          status: string
          type: string
          user_id: string
        }[]
      }
      get_my_wallet_activity_unified: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount_bonk: number
          amount_fiat_est: number
          happened_at: string
          meta: Json
          source: string
          status: string
          type: string
          user_id: string
        }[]
      }
      get_my_wallet_balances: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_my_wallet_balances_new: {
        Args: Record<PropertyKey, never>
        Returns: {
          bonk_available: number
          bonk_balance_total: number
          bonk_locked: number
          user_id: string
        }[]
      }
      get_my_wallet_balances_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          bonk_available: number
          bonk_balance_total: number
          bonk_locked: number
          user_id: string
        }[]
      }
      get_secure_profile: {
        Args: { target_user_id?: string }
        Returns: {
          bonk_balance: number
          created_at: string
          deleted_at: string
          email: string
          full_name: string
          id: string
          referral_code: string
          referred_by: string
          role: string
          total_earned: number
          updated_at: string
          user_id: string
          wallet_address: string
        }[]
      }
      get_wallet_balances: {
        Args: { target_user_id?: string }
        Returns: {
          bonk_available: number
          bonk_balance_total: number
          bonk_locked: number
          user_id: string
        }[]
      }
      log_auth_event: {
        Args: {
          p_error_message?: string
          p_event_type: string
          p_ip_address?: string
          p_metadata?: Json
          p_success?: boolean
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      log_blocked_gift_card_redemption: {
        Args: { _details: Json; _reason: string; _user_id: string }
        Returns: undefined
      }
      log_blocked_payout: {
        Args: { _details: Json; _reason: string; _user_id: string }
        Returns: undefined
      }
      mask_email: {
        Args: { p_email: string }
        Returns: string
      }
      mask_wallet: {
        Args: { p_wallet: string }
        Returns: string
      }
      process_all_unclaimed_referrals: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      process_my_unclaimed_referrals: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      process_purchase_cashback: {
        Args: {
          p_affiliate_id?: string
          p_merchant_name: string
          p_order_id?: string
          p_purchase_amount: number
          p_url?: string
          p_user_id: string
        }
        Returns: Json
      }
      process_referral_reward: {
        Args: { p_referred_user_id: string }
        Returns: Json
      }
      record_offer_click: {
        Args: {
          p_ip: string
          p_offer_id: string
          p_referrer: string
          p_user_agent: string
          p_user_id: string
        }
        Returns: {
          click_id: string
        }[]
      }
      record_tax_transaction: {
        Args: {
          p_amount_bonk: number
          p_amount_eur: number
          p_exchange_rate: number
          p_source_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      redeem_gift_card_secure: {
        Args: { _bonk_amount: number; _gift_card_id: string }
        Returns: Json
      }
      request_account_deletion: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      reset_test_referral: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      safe_generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      simulate_referral_signup_demo: {
        Args: { p_referral_code: string; p_scenario_name?: string }
        Returns: Json
      }
      test_referral_claim: {
        Args: { p_referral_code: string }
        Returns: Json
      }
      test_referral_claim_demo: {
        Args: { p_referral_code: string }
        Returns: Json
      }
      track_referral_visit: {
        Args: {
          p_device_fingerprint?: string
          p_ip_address?: string
          p_landing_page?: string
          p_referral_code: string
          p_session_id?: string
          p_user_agent?: string
          p_utm_params?: Json
        }
        Returns: Json
      }
      unlock_referral_payouts: {
        Args: { _user_id: string }
        Returns: undefined
      }
      update_session_activity: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      url_encode: {
        Args: { in_text: string }
        Returns: string
      }
    }
    Enums: {
      cashback_status: "pending" | "approved" | "paid"
      offer_status: "active" | "inactive" | "expired"
      transaction_status: "pending" | "completed" | "failed"
      user_role: "user" | "admin"
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
      cashback_status: ["pending", "approved", "paid"],
      offer_status: ["active", "inactive", "expired"],
      transaction_status: ["pending", "completed", "failed"],
      user_role: ["user", "admin"],
    },
  },
} as const
