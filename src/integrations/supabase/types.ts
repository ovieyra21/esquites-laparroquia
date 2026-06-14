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
      cash_register: {
        Row: {
          closed_at: string | null
          closing_amount: number | null
          id: string
          opened_at: string | null
          opening_amount: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          closed_at?: string | null
          closing_amount?: number | null
          id?: string
          opened_at?: string | null
          opening_amount?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          closed_at?: string | null
          closing_amount?: number | null
          id?: string
          opened_at?: string | null
          opening_amount?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          amount: number | null
          concept: string | null
          created_at: string | null
          id: string
          notes: string | null
        }
        Insert: {
          amount?: number | null
          concept?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
        }
        Update: {
          amount?: number | null
          concept?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
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
      products: {
        Row: {
          active: boolean | null
          category_id: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          name: string
          price: number
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          name: string
          price: number
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
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
          product_id: string | null
          quantity: number | null
          sale_id: string | null
          total: number | null
          unit_price: number | null
        }
        Insert: {
          id?: string
          product_id?: string | null
          quantity?: number | null
          sale_id?: string | null
          total?: number | null
          unit_price?: number | null
        }
        Update: {
          id?: string
          product_id?: string | null
          quantity?: number | null
          sale_id?: string | null
          total?: number | null
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
          cash_received: number | null
          change_amount: number | null
          created_at: string | null
          folio: number
          id: string
          payment_method: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
        }
        Insert: {
          cash_received?: number | null
          change_amount?: number | null
          created_at?: string | null
          folio?: number
          id?: string
          payment_method?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
        }
        Update: {
          cash_received?: number | null
          change_amount?: number | null
          created_at?: string | null
          folio?: number
          id?: string
          payment_method?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          address: string | null
          business_name: string | null
          id: string
          logo: string | null
          phone: string | null
          qr_url: string | null
          slogan: string | null
          tax: number | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          id?: string
          logo?: string | null
          phone?: string | null
          qr_url?: string | null
          slogan?: string | null
          tax?: number | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          id?: string
          logo?: string | null
          phone?: string | null
          qr_url?: string | null
          slogan?: string | null
          tax?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
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
    Enums: {},
  },
} as const
