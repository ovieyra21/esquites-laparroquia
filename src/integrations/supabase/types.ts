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
      cash_movements: {
        Row: {
          amount: number | null
          cash_register_id: string | null
          concept: string | null
          created_at: string | null
          id: string
          notes: string | null
          payment_method: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          cash_register_id?: string | null
          concept?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          type?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          cash_register_id?: string | null
          concept?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_register"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register: {
        Row: {
          closed_at: string | null
          closing_amount: number | null
          closing_breakdown: Json | null
          created_at: string | null
          difference: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opening_amount: number
          opening_breakdown: Json | null
          real_amount: number | null
          status: string
          total_sales_card: number | null
          total_sales_cash: number | null
          total_sales_transfer: number | null
          user_id: string | null
        }
        Insert: {
          closed_at?: string | null
          closing_amount?: number | null
          closing_breakdown?: Json | null
          created_at?: string | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          opening_breakdown?: Json | null
          real_amount?: number | null
          status?: string
          total_sales_card?: number | null
          total_sales_cash?: number | null
          total_sales_transfer?: number | null
          user_id?: string | null
        }
        Update: {
          closed_at?: string | null
          closing_amount?: number | null
          closing_breakdown?: Json | null
          created_at?: string | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          opening_breakdown?: Json | null
          real_amount?: number | null
          status?: string
          total_sales_card?: number | null
          total_sales_cash?: number | null
          total_sales_transfer?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          loyalty_points: number | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      digital_menus: {
        Row: {
          active: boolean | null
          file_url: string | null
          filename: string | null
          id: string
          uploaded_at: string | null
        }
        Insert: {
          active?: boolean | null
          file_url?: string | null
          filename?: string | null
          id?: string
          uploaded_at?: string | null
        }
        Update: {
          active?: boolean | null
          file_url?: string | null
          filename?: string | null
          id?: string
          uploaded_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string | null
          expense_date: string
          id: string
          ocr_text: string | null
          payment_method: string | null
          photo_url: string | null
          supplier: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          ocr_text?: string | null
          payment_method?: string | null
          photo_url?: string | null
          supplier?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          ocr_text?: string | null
          payment_method?: string | null
          photo_url?: string | null
          supplier?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          cost_per_unit: number
          created_at: string | null
          id: string
          min_stock: number
          name: string
          stock: number
          unit: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          min_stock?: number
          name: string
          stock?: number
          unit: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          min_stock?: number
          name?: string
          stock?: number
          unit?: string
        }
        Relationships: []
      }
      modifier_groups: {
        Row: {
          id: string
          name: string | null
          required: boolean | null
        }
        Insert: {
          id?: string
          name?: string | null
          required?: boolean | null
        }
        Update: {
          id?: string
          name?: string | null
          required?: boolean | null
        }
        Relationships: []
      }
      modifiers: {
        Row: {
          extra_price: number | null
          id: string
          modifier_group_id: string | null
          name: string | null
        }
        Insert: {
          extra_price?: number | null
          id?: string
          modifier_group_id?: string | null
          name?: string | null
        }
        Update: {
          extra_price?: number | null
          id?: string
          modifier_group_id?: string | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modifiers_modifier_group_id_fkey"
            columns: ["modifier_group_id"]
            isOneToOne: false
            referencedRelation: "modifier_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modifiers: {
        Row: {
          id: string
          modifier_group_id: string | null
          product_id: string | null
        }
        Insert: {
          id?: string
          modifier_group_id?: string | null
          product_id?: string | null
        }
        Update: {
          id?: string
          modifier_group_id?: string | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_modifiers_modifier_group_id_fkey"
            columns: ["modifier_group_id"]
            isOneToOne: false
            referencedRelation: "modifier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modifiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recipes: {
        Row: {
          id: string
          inventory_item_id: string | null
          product_id: string | null
          quantity: number
        }
        Insert: {
          id?: string
          inventory_item_id?: string | null
          product_id?: string | null
          quantity: number
        }
        Update: {
          id?: string
          inventory_item_id?: string | null
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          category_id: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          emoji: string | null
          id: string
          image_url: string | null
          includes: string[] | null
          name: string
          price: number
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          includes?: string[] | null
          name: string
          price: number
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          includes?: string[] | null
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_item_modifiers: {
        Row: {
          extra_price: number | null
          id: string
          modifier_name: string | null
          sale_item_id: string | null
        }
        Insert: {
          extra_price?: number | null
          id?: string
          modifier_name?: string | null
          sale_item_id?: string | null
        }
        Update: {
          extra_price?: number | null
          id?: string
          modifier_name?: string | null
          sale_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_item_modifiers_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          product_emoji: string | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          sale_id: string | null
          total: number | null
          unit_cost: number | null
          unit_price: number | null
        }
        Insert: {
          id?: string
          product_emoji?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          sale_id?: string | null
          total?: number | null
          unit_cost?: number | null
          unit_price?: number | null
        }
        Update: {
          id?: string
          product_emoji?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          sale_id?: string | null
          total?: number | null
          unit_cost?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cancelled: boolean
          cancelled_at: string | null
          cancelled_by: string | null
          cash_received: number | null
          cash_register_id: string | null
          change_amount: number | null
          created_at: string | null
          customer_id: string | null
          discount: number
          discount_authorized_by: string | null
          discount_reason: string | null
          folio: string
          id: string
          is_courtesy: boolean
          kds_status: string | null
          payment_details: Json | null
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          status: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
          user_id: string | null
        }
        Insert: {
          cancelled?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          cash_received?: number | null
          cash_register_id?: string | null
          change_amount?: number | null
          created_at?: string | null
          customer_id?: string | null
          discount?: number
          discount_authorized_by?: string | null
          discount_reason?: string | null
          folio?: string
          id?: string
          is_courtesy?: boolean
          kds_status?: string | null
          payment_details?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          user_id?: string | null
        }
        Update: {
          cancelled?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          cash_received?: number | null
          cash_register_id?: string | null
          change_amount?: number | null
          created_at?: string | null
          customer_id?: string | null
          discount?: number
          discount_authorized_by?: string | null
          discount_reason?: string | null
          folio?: string
          id?: string
          is_courtesy?: boolean
          kds_status?: string | null
          payment_details?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          address: string | null
          auto_cut: boolean | null
          auto_print: boolean | null
          business_name: string | null
          footer_message: string | null
          id: string
          logo: string | null
          logo_data: string | null
          logo_url: string | null
          mp_access_token: string | null
          mp_device_id: string | null
          mp_user_id: string | null
          open_drawer: boolean | null
          payment_provider: string | null
          phone: string | null
          print_mode: string
          printer_enabled: boolean | null
          printer_ip: string | null
          printer_port: number | null
          printer_width: number | null
          proxy_url: string
          qr_url: string | null
          rfc: string | null
          show_logo: boolean | null
          slogan: string | null
          tax: number | null
          updated_at: string | null
          whatsapp_number: string | null
          zettle_api_key: string | null
        }
        Insert: {
          address?: string | null
          auto_cut?: boolean | null
          auto_print?: boolean | null
          business_name?: string | null
          footer_message?: string | null
          id?: string
          logo?: string | null
          logo_data?: string | null
          logo_url?: string | null
          mp_access_token?: string | null
          mp_device_id?: string | null
          mp_user_id?: string | null
          open_drawer?: boolean | null
          payment_provider?: string | null
          phone?: string | null
          print_mode?: string
          printer_enabled?: boolean | null
          printer_ip?: string | null
          printer_port?: number | null
          printer_width?: number | null
          proxy_url?: string
          qr_url?: string | null
          rfc?: string | null
          show_logo?: boolean | null
          slogan?: string | null
          tax?: number | null
          updated_at?: string | null
          whatsapp_number?: string | null
          zettle_api_key?: string | null
        }
        Update: {
          address?: string | null
          auto_cut?: boolean | null
          auto_print?: boolean | null
          business_name?: string | null
          footer_message?: string | null
          id?: string
          logo?: string | null
          logo_data?: string | null
          logo_url?: string | null
          mp_access_token?: string | null
          mp_device_id?: string | null
          mp_user_id?: string | null
          open_drawer?: boolean | null
          payment_provider?: string | null
          phone?: string | null
          print_mode?: string
          printer_enabled?: boolean | null
          printer_ip?: string | null
          printer_port?: number | null
          printer_width?: number | null
          proxy_url?: string
          qr_url?: string | null
          rfc?: string | null
          show_logo?: boolean | null
          slogan?: string | null
          tax?: number | null
          updated_at?: string | null
          whatsapp_number?: string | null
          zettle_api_key?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      settings_public: {
        Row: {
          business_name: string | null
          footer_message: string | null
          id: string | null
          slogan: string | null
          tax: number | null
        }
        Insert: {
          business_name?: string | null
          footer_message?: string | null
          id?: string | null
          slogan?: string | null
          tax?: number | null
        }
        Update: {
          business_name?: string | null
          footer_message?: string | null
          id?: string | null
          slogan?: string | null
          tax?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_has_any_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      get_cash_register_summary: {
        Args: { _register_id: string }
        Returns: Json
      }
      get_print_settings: {
        Args: never
        Returns: {
          address: string
          auto_cut: boolean
          auto_print: boolean
          business_name: string
          footer_message: string
          open_drawer: boolean
          phone: string
          print_mode: string
          printer_enabled: boolean
          printer_ip: string
          printer_port: number
          printer_width: number
          proxy_url: string
          show_logo: boolean
          slogan: string
          tax: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "cajero" | "supervisor"
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
      app_role: ["admin", "cajero", "supervisor"],
    },
  },
} as const
