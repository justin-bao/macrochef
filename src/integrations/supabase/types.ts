export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_connections: {
        Row: {
          access_token: string | null;
          connected_at: string;
          expires_at: string | null;
          id: string;
          provider: "strava";
          provider_user_id: string | null;
          provider_username: string | null;
          refresh_token: string | null;
          scopes: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token?: string | null;
          connected_at?: string;
          expires_at?: string | null;
          id?: string;
          provider: "strava";
          provider_user_id?: string | null;
          provider_username?: string | null;
          refresh_token?: string | null;
          scopes?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token?: string | null;
          connected_at?: string;
          expires_at?: string | null;
          id?: string;
          provider?: "strava";
          provider_user_id?: string | null;
          provider_username?: string | null;
          refresh_token?: string | null;
          scopes?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      macro_goals: {
        Row: {
          carbs_g: number;
          fat_g: number;
          kcal: number;
          protein_g: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          carbs_g?: number;
          fat_g?: number;
          kcal?: number;
          protein_g?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          carbs_g?: number;
          fat_g?: number;
          kcal?: number;
          protein_g?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          age: number;
          goal:
            | "lose_body_fat"
            | "build_muscle"
            | "maintain_weight"
            | "fuel_runs"
            | "general_nutrition";
          height: number;
          sex: "female" | "male" | "unspecified";
          unit_system: "imperial" | "metric";
          updated_at: string;
          user_id: string;
          weight: number;
        };
        Insert: {
          age?: number;
          goal?:
            | "lose_body_fat"
            | "build_muscle"
            | "maintain_weight"
            | "fuel_runs"
            | "general_nutrition";
          height?: number;
          sex?: "female" | "male" | "unspecified";
          unit_system?: "imperial" | "metric";
          updated_at?: string;
          user_id: string;
          weight?: number;
        };
        Update: {
          age?: number;
          goal?:
            | "lose_body_fat"
            | "build_muscle"
            | "maintain_weight"
            | "fuel_runs"
            | "general_nutrition";
          height?: number;
          sex?: "female" | "male" | "unspecified";
          unit_system?: "imperial" | "metric";
          updated_at?: string;
          user_id?: string;
          weight?: number;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          carbs_g: number | null;
          created_at: string;
          description: string | null;
          fat_g: number | null;
          id: number;
          image_url: string | null;
          ingredients: Json;
          ingredient_names: string[];
          instructions: Json;
          kcal: number | null;
          protein_g: number | null;
          detail_bucket_id: string;
          detail_object_path: string | null;
          servings: number | null;
          source: string;
          source_id: string;
          title: string;
          total_minutes: number | null;
        };
        Insert: {
          carbs_g?: number | null;
          created_at?: string;
          description?: string | null;
          fat_g?: number | null;
          id?: number;
          image_url?: string | null;
          ingredients?: Json;
          ingredient_names?: string[];
          instructions?: Json;
          kcal?: number | null;
          protein_g?: number | null;
          detail_bucket_id?: string;
          detail_object_path?: string | null;
          servings?: number | null;
          source: string;
          source_id: string;
          title: string;
          total_minutes?: number | null;
        };
        Update: {
          carbs_g?: number | null;
          created_at?: string;
          description?: string | null;
          fat_g?: number | null;
          id?: number;
          image_url?: string | null;
          ingredients?: Json;
          ingredient_names?: string[];
          instructions?: Json;
          kcal?: number | null;
          protein_g?: number | null;
          detail_bucket_id?: string;
          detail_object_path?: string | null;
          servings?: number | null;
          source?: string;
          source_id?: string;
          title?: string;
          total_minutes?: number | null;
        };
        Relationships: [];
      };
      recipe_detail_objects: {
        Row: {
          bucket_id: string;
          byte_size: number | null;
          content_encoding: string;
          content_sha256: string | null;
          content_type: string;
          created_at: string;
          object_path: string;
          recipe_id: number;
          source: string;
          source_id: string;
          updated_at: string;
        };
        Insert: {
          bucket_id?: string;
          byte_size?: number | null;
          content_encoding?: string;
          content_sha256?: string | null;
          content_type?: string;
          created_at?: string;
          object_path: string;
          recipe_id: number;
          source: string;
          source_id: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          byte_size?: number | null;
          content_encoding?: string;
          content_sha256?: string | null;
          content_type?: string;
          created_at?: string;
          object_path?: string;
          recipe_id?: number;
          source?: string;
          source_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_detail_objects_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: true;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_recipes: {
        Row: {
          applied_swaps: Json | null;
          computed_macros: Json | null;
          created_at: string;
          id: string;
          image: string | null;
          scaled_ingredients: Json | null;
          servings: number | null;
          spoonacular_id: number;
          target_macros: Json | null;
          title: string;
          user_id: string;
        };
        Insert: {
          applied_swaps?: Json | null;
          computed_macros?: Json | null;
          created_at?: string;
          id?: string;
          image?: string | null;
          scaled_ingredients?: Json | null;
          servings?: number | null;
          spoonacular_id: number;
          target_macros?: Json | null;
          title: string;
          user_id: string;
        };
        Update: {
          applied_swaps?: Json | null;
          computed_macros?: Json | null;
          created_at?: string;
          id?: string;
          image?: string | null;
          scaled_ingredients?: Json | null;
          servings?: number | null;
          spoonacular_id?: number;
          target_macros?: Json | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      activity_connection_provider: "strava";
      profile_sex: "female" | "male" | "unspecified";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
