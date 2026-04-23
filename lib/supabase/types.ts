/**
 * Placeholder Database type. Regenerate from a real Supabase project with:
 *   npx supabase gen types typescript --project-id <ref> --schema public > lib/supabase/types.ts
 */
export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>;
    Views: Record<string, { Row: Record<string, unknown> }>;
    Functions: Record<string, unknown>;
    Enums: Record<string, string>;
  };
};
