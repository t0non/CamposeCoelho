export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'customer' | 'seller' | 'admin'
export type CompanyStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type ProfileStatus = 'active' | 'inactive' | 'suspended'
export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
export type DocStatus = 'pending' | 'approved' | 'rejected'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          role: UserRole
          company_id: string | null
          avatar_url: string | null
          status: ProfileStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          phone?: string | null
          role?: UserRole
          company_id?: string | null
          avatar_url?: string | null
          status?: ProfileStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          email?: string
          phone?: string | null
          role?: UserRole
          company_id?: string | null
          avatar_url?: string | null
          status?: ProfileStatus
          updated_at?: string
        }
      }

      companies: {
        Row: {
          id: string
          cnpj: string
          company_name: string
          trade_name: string | null
          state_registration: string | null
          segment: string | null
          phone: string | null
          whatsapp: string | null
          email: string | null
          website: string | null
          status: CompanyStatus
          seller_id: string | null
          price_table_id: string | null
          internal_notes: string | null
          approved_at: string | null
          rejected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cnpj: string
          company_name: string
          trade_name?: string | null
          state_registration?: string | null
          segment?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          website?: string | null
          status?: CompanyStatus
          seller_id?: string | null
          price_table_id?: string | null
          internal_notes?: string | null
          approved_at?: string | null
          rejected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          cnpj?: string
          company_name?: string
          trade_name?: string | null
          state_registration?: string | null
          segment?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          website?: string | null
          status?: CompanyStatus
          seller_id?: string | null
          price_table_id?: string | null
          internal_notes?: string | null
          approved_at?: string | null
          rejected_at?: string | null
          updated_at?: string
        }
      }

      company_members: {
        Row: {
          id: string
          company_id: string
          profile_id: string
          role: string
          is_primary: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          profile_id: string
          role?: string
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          role?: string
          is_primary?: boolean
          updated_at?: string
        }
      }

      company_documents: {
        Row: {
          id: string
          company_id: string
          document_type: string
          file_path: string
          file_name: string
          status: DocStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          document_type: string
          file_path: string
          file_name: string
          status?: DocStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          document_type?: string
          file_path?: string
          file_name?: string
          status?: DocStatus
          notes?: string | null
          updated_at?: string
        }
      }

      addresses: {
        Row: {
          id: string
          profile_id: string | null
          company_id: string | null
          label: string
          zip_code: string
          street: string
          number: string
          complement: string | null
          neighborhood: string
          city: string
          state: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          company_id?: string | null
          label?: string
          zip_code: string
          street: string
          number: string
          complement?: string | null
          neighborhood: string
          city: string
          state: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          label?: string
          zip_code?: string
          street?: string
          number?: string
          complement?: string | null
          neighborhood?: string
          city?: string
          state?: string
          is_default?: boolean
          updated_at?: string
        }
      }

      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          image_url: string | null
          parent_id: string | null
          position: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          image_url?: string | null
          parent_id?: string | null
          position?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          description?: string | null
          image_url?: string | null
          parent_id?: string | null
          position?: number
          is_active?: boolean
          updated_at?: string
        }
      }

      brands: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          logo_url?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }

      products: {
        Row: {
          id: string
          sku: string
          name: string
          slug: string
          description: string | null
          category_id: string | null
          brand_id: string | null
          unit: string
          min_quantity: number
          multiple_quantity: number
          weight_grams: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sku: string
          name: string
          slug: string
          description?: string | null
          category_id?: string | null
          brand_id?: string | null
          unit?: string
          min_quantity?: number
          multiple_quantity?: number
          weight_grams?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          sku?: string
          name?: string
          slug?: string
          description?: string | null
          category_id?: string | null
          brand_id?: string | null
          unit?: string
          min_quantity?: number
          multiple_quantity?: number
          weight_grams?: number | null
          is_active?: boolean
          updated_at?: string
        }
      }

      product_images: {
        Row: {
          id: string
          product_id: string
          url: string
          alt_text: string | null
          position: number
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          alt_text?: string | null
          position?: number
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          url?: string
          alt_text?: string | null
          position?: number
          is_primary?: boolean
        }
      }

      product_variants: {
        Row: {
          id: string
          product_id: string
          sku: string
          name: string
          attributes: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          sku: string
          name: string
          attributes?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          sku?: string
          name?: string
          attributes?: Json
          updated_at?: string
        }
      }

      inventories: {
        Row: {
          id: string
          product_id: string
          variant_id: string | null
          quantity_available: number
          quantity_reserved: number
          min_stock_alert: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          variant_id?: string | null
          quantity_available?: number
          quantity_reserved?: number
          min_stock_alert?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          quantity_available?: number
          quantity_reserved?: number
          min_stock_alert?: number
          updated_at?: string
        }
      }

      price_tables: {
        Row: {
          id: string
          name: string
          description: string | null
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          is_default?: boolean
          is_active?: boolean
          updated_at?: string
        }
      }

      price_table_products: {
        Row: {
          id: string
          price_table_id: string
          product_id: string
          variant_id: string | null
          unit_price: number
          promotional_price: number | null
          promotion_starts_at: string | null
          promotion_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          price_table_id: string
          product_id: string
          variant_id?: string | null
          unit_price: number
          promotional_price?: number | null
          promotion_starts_at?: string | null
          promotion_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          unit_price?: number
          promotional_price?: number | null
          promotion_starts_at?: string | null
          promotion_ends_at?: string | null
          updated_at?: string
        }
      }

      banners: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          image_url: string
          link_url: string | null
          position: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          subtitle?: string | null
          image_url: string
          link_url?: string | null
          position?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          subtitle?: string | null
          image_url?: string
          link_url?: string | null
          position?: number
          is_active?: boolean
          updated_at?: string
        }
      }

      collections: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          banner_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          banner_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          description?: string | null
          banner_url?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }

      collection_products: {
        Row: {
          id: string
          collection_id: string
          product_id: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          collection_id: string
          product_id: string
          position?: number
          created_at?: string
        }
        Update: {
          position?: number
        }
      }

      favorites: {
        Row: {
          id: string
          profile_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          product_id: string
          created_at?: string
        }
        Update: Record<string, never>
      }

      carts: {
        Row: {
          id: string
          profile_id: string
          company_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          company_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: string
          updated_at?: string
        }
      }

      cart_items: {
        Row: {
          id: string
          cart_id: string | null
          profile_id: string
          product_id: string
          variant_id: string | null
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cart_id?: string | null
          profile_id: string
          product_id: string
          variant_id?: string | null
          quantity: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          quantity?: number
          updated_at?: string
        }
      }

      shipping_methods: {
        Row: {
          id: string
          name: string
          code: string
          description: string | null
          estimated_days: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          description?: string | null
          estimated_days?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          code?: string
          description?: string | null
          estimated_days?: number
          is_active?: boolean
          updated_at?: string
        }
      }

      payment_terms: {
        Row: {
          id: string
          name: string
          code: string
          days_to_pay: number
          installments: number
          min_order_value: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          days_to_pay?: number
          installments?: number
          min_order_value?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          code?: string
          days_to_pay?: number
          installments?: number
          min_order_value?: number
          is_active?: boolean
          updated_at?: string
        }
      }

      orders: {
        Row: {
          id: string
          order_number: string
          company_id: string
          profile_id: string
          seller_id: string | null
          status: OrderStatus
          shipping_address_id: string | null
          shipping_method_id: string | null
          payment_term_id: string | null
          subtotal: number
          discount: number
          shipping_cost: number
          total: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number?: string
          company_id: string
          profile_id: string
          seller_id?: string | null
          status?: OrderStatus
          shipping_address_id?: string | null
          shipping_method_id?: string | null
          payment_term_id?: string | null
          subtotal?: number
          discount?: number
          shipping_cost?: number
          total?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: OrderStatus
          shipping_address_id?: string | null
          shipping_method_id?: string | null
          payment_term_id?: string | null
          subtotal?: number
          discount?: number
          shipping_cost?: number
          total?: number
          notes?: string | null
          updated_at?: string
        }
      }

      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          variant_id: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          variant_id?: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          quantity?: number
          unit_price?: number
          total_price?: number
        }
      }

      order_status_history: {
        Row: {
          id: string
          order_id: string
          status: OrderStatus
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          status: OrderStatus
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          notes?: string | null
        }
      }

      notifications: {
        Row: {
          id: string
          profile_id: string
          title: string
          message: string
          type: string
          read_at: string | null
          link_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          title: string
          message: string
          type?: string
          read_at?: string | null
          link_url?: string | null
          created_at?: string
        }
        Update: {
          read_at?: string | null
        }
      }

      newsletter_leads: {
        Row: {
          id: string
          email: string
          name: string | null
          company_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          company_name?: string | null
          created_at?: string
        }
        Update: {
          name?: string | null
          company_name?: string | null
        }
      }

      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          target_table: string
          target_id: string | null
          payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          target_table: string
          target_id?: string | null
          payload?: Json | null
          created_at?: string
        }
        Update: {
          action?: string
          payload?: Json | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      company_status: CompanyStatus
      profile_status: ProfileStatus
      order_status: OrderStatus
      doc_status: DocStatus
    }
  }
}
