/**
 * Hand-written Database types for the tables we use in Week 2.
 * Regenerate from the real Supabase project with:
 *   npx supabase gen types typescript --project-id dqrrldulytvbnvuywonm --schema public > lib/supabase/types.ts
 */

export type UserRole = "patient" | "dentist_admin" | "ops";
export type DentistTitle =
  | "professor"
  | "consultant"
  | "specialist"
  | "resident";
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";
export type CalendarMode = "google" | "manual";

export type WorkingHoursDay = {
  day: number; // 0 = Sunday, 6 = Saturday
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  breaks?: { start: string; end: string }[];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          phone: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name: string;
          phone?: string | null;
          email?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      clinics: {
        Row: {
          id: string;
          slug: string;
          name_ar: string;
          name_en: string;
          area_id: string | null;
          address_ar: string | null;
          address_en: string | null;
          phone: string | null;
          whatsapp: string | null;
          lat: number | null;
          lng: number | null;
          logo_url: string | null;
          hero_image_url: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["clinics"]["Row"]> & {
          slug: string;
          name_ar: string;
          name_en: string;
        };
        Update: Partial<Database["public"]["Tables"]["clinics"]["Row"]>;
      };
      clinic_admins: {
        Row: {
          clinic_id: string;
          profile_id: string;
          created_at: string;
        };
        Insert: { clinic_id: string; profile_id: string };
        Update: Partial<{ clinic_id: string; profile_id: string }>;
      };
      dentists: {
        Row: {
          id: string;
          slug: string;
          name_ar: string;
          name_en: string;
          title: DentistTitle;
          years_experience: number | null;
          bio_ar: string | null;
          bio_en: string | null;
          photo_url: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["dentists"]["Row"]> & {
          slug: string;
          name_ar: string;
          name_en: string;
        };
        Update: Partial<Database["public"]["Tables"]["dentists"]["Row"]>;
      };
      clinic_dentists: {
        Row: {
          id: string;
          clinic_id: string;
          dentist_id: string;
          fee_egp: number;
          slot_minutes: number;
          working_hours: WorkingHoursDay[];
          calendar_mode: CalendarMode;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["clinic_dentists"]["Row"]
        > & { clinic_id: string; dentist_id: string; fee_egp: number };
        Update: Partial<Database["public"]["Tables"]["clinic_dentists"]["Row"]>;
      };
      dentist_calendars: {
        Row: {
          id: string;
          dentist_id: string;
          google_calendar_id: string;
          encrypted_refresh_token: string;
          watch_channel_id: string | null;
          watch_resource_id: string | null;
          watch_expires_at: string | null;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          dentist_id: string;
          google_calendar_id: string;
          encrypted_refresh_token: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["dentist_calendars"]["Row"]
        >;
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          clinic_dentist_id: string;
          slot_start: string;
          slot_end: string;
          fee_at_booking_egp: number;
          status: AppointmentStatus;
          patient_phone: string;
          patient_note: string | null;
          gcal_event_id: string | null;
          reminder_sent_at: string | null;
          review_request_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["appointments"]["Row"],
          | "id"
          | "created_at"
          | "updated_at"
          | "status"
          | "gcal_event_id"
          | "reminder_sent_at"
          | "review_request_sent_at"
        > & {
          status?: AppointmentStatus;
          gcal_event_id?: string | null;
          reminder_sent_at?: string | null;
          review_request_sent_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["appointments"]["Row"]>;
      };
      reviews: {
        Row: {
          id: string;
          appointment_id: string;
          rating: number;
          comment_ar: string | null;
          comment_en: string | null;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          appointment_id: string;
          rating: number;
          comment_ar?: string | null;
          comment_en?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Row"]>;
      };
      specialties: {
        Row: {
          id: string;
          slug: string;
          name_ar: string;
          name_en: string;
          icon: string | null;
        };
        Insert: { slug: string; name_ar: string; name_en: string };
        Update: Partial<Database["public"]["Tables"]["specialties"]["Row"]>;
      };
      areas: {
        Row: {
          id: string;
          slug: string;
          name_ar: string;
          name_en: string;
          lat: number | null;
          lng: number | null;
        };
        Insert: { slug: string; name_ar: string; name_en: string };
        Update: Partial<Database["public"]["Tables"]["areas"]["Row"]>;
      };
      insurance_providers: {
        Row: {
          id: string;
          slug: string;
          name_ar: string;
          name_en: string;
          logo_url: string | null;
        };
        Insert: { slug: string; name_ar: string; name_en: string };
        Update: Partial<
          Database["public"]["Tables"]["insurance_providers"]["Row"]
        >;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      dentist_title: DentistTitle;
      appointment_status: AppointmentStatus;
    };
  };
};
