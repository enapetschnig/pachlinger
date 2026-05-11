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
      heartbeat: {
        Row: {
          id: number
          last_ping: string
          ping_count: number
        }
        Insert: {
          id?: number
          last_ping?: string
          ping_count?: number
        }
        Update: {
          id?: number
          last_ping?: string
          ping_count?: number
        }
        Relationships: []
      }
      kunden: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          kunden_nummer: string | null
          name: string
          notizen: string | null
          ort: string | null
          plz: string | null
          strasse: string | null
          telefon: string | null
          uid_nummer: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          kunden_nummer?: string | null
          name: string
          notizen?: string | null
          ort?: string | null
          plz?: string | null
          strasse?: string | null
          telefon?: string | null
          uid_nummer?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          kunden_nummer?: string | null
          name?: string
          notizen?: string | null
          ort?: string | null
          plz?: string | null
          strasse?: string | null
          telefon?: string | null
          uid_nummer?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lieferschein_positionen: {
        Row: {
          bezeichnung: string
          created_at: string
          einheit: string
          id: string
          lieferschein_id: string
          menge: number
          pos_nr: number
          rabatt_eur: number | null
        }
        Insert: {
          bezeichnung: string
          created_at?: string
          einheit?: string
          id?: string
          lieferschein_id: string
          menge?: number
          pos_nr: number
          rabatt_eur?: number | null
        }
        Update: {
          bezeichnung?: string
          created_at?: string
          einheit?: string
          id?: string
          lieferschein_id?: string
          menge?: number
          pos_nr?: number
          rabatt_eur?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lieferschein_positionen_lieferschein_id_fkey"
            columns: ["lieferschein_id"]
            isOneToOne: false
            referencedRelation: "lieferscheine"
            referencedColumns: ["id"]
          },
        ]
      }
      lieferscheine: {
        Row: {
          angebot_datum: string | null
          angebot_nr: string | null
          bauseits: string[]
          betreff: string | null
          created_at: string
          empfaenger_name: string
          empfaenger_ort: string | null
          empfaenger_plz: string | null
          empfaenger_strasse: string | null
          empfaenger_uid: string | null
          id: string
          jahr: number
          kunde_id: string | null
          kunden_nummer: string | null
          leistung: string | null
          lfd_nr: number
          lieferschein_datum: string
          nummer: string | null
          status: Database["public"]["Enums"]["lieferschein_status"]
          unterschrift_datum: string | null
          unterschrift_image_url: string | null
          unterschrift_ort: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          angebot_datum?: string | null
          angebot_nr?: string | null
          bauseits?: string[]
          betreff?: string | null
          created_at?: string
          empfaenger_name: string
          empfaenger_ort?: string | null
          empfaenger_plz?: string | null
          empfaenger_strasse?: string | null
          empfaenger_uid?: string | null
          id?: string
          jahr?: number
          kunde_id?: string | null
          kunden_nummer?: string | null
          leistung?: string | null
          lfd_nr?: number
          lieferschein_datum?: string
          nummer?: string | null
          status?: Database["public"]["Enums"]["lieferschein_status"]
          unterschrift_datum?: string | null
          unterschrift_image_url?: string | null
          unterschrift_ort?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          angebot_datum?: string | null
          angebot_nr?: string | null
          bauseits?: string[]
          betreff?: string | null
          created_at?: string
          empfaenger_name?: string
          empfaenger_ort?: string | null
          empfaenger_plz?: string | null
          empfaenger_strasse?: string | null
          empfaenger_uid?: string | null
          id?: string
          jahr?: number
          kunde_id?: string | null
          kunden_nummer?: string | null
          leistung?: string | null
          lfd_nr?: number
          lieferschein_datum?: string
          nummer?: string | null
          status?: Database["public"]["Enums"]["lieferschein_status"]
          unterschrift_datum?: string | null
          unterschrift_image_url?: string | null
          unterschrift_ort?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lieferscheine_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          nachname: string
          updated_at: string
          vorname: string
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          nachname: string
          updated_at?: string
          vorname: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          nachname?: string
          updated_at?: string
          vorname?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_user: { Args: { _uid: string }; Returns: undefined }
      admin_get_user_email: { Args: { _uid: string }; Returns: string }
      ensure_user_profile: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      heartbeat_tick: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "administrator" | "mitarbeiter"
      lieferschein_status: "entwurf" | "versendet" | "unterschrieben"
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
      app_role: ["administrator", "mitarbeiter"],
      lieferschein_status: ["entwurf", "versendet", "unterschrieben"],
    },
  },
} as const

