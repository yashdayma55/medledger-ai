export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "patient" | "provider" | "admin" | "superuser";
export type UserStatus = "pending" | "active" | "disabled";
export type TokenPurpose = "email_verify" | "password_reset" | "login_otp";
export type TokenChannel = "email" | "sms" | "app";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          phone_e164: string | null;
          password_hash: string | null;
          role: UserRole;
          status: UserStatus;
          email_verified_at: string | null;
          phone_verified_at: string | null;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          phone_e164?: string | null;
          password_hash?: string | null;
          role: UserRole;
          status?: UserStatus;
          email_verified_at?: string | null;
          phone_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      verification_tokens: {
        Row: {
          id: string;
          user_id: string;
          purpose: TokenPurpose;
          token_hash: string;
          channel: TokenChannel;
          sent_to: string;
          expires_at: string;
          consumed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          purpose: TokenPurpose;
          token_hash: string;
          channel: TokenChannel;
          sent_to: string;
          expires_at: string;
          consumed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["verification_tokens"]["Insert"]>;
      };
      patient_profile: {
        Row: {
          user_id: string;
          full_name: string;
          dob: string | null;
          sex_at_birth: string | null;
          gender_identity: string | null;
          address_json: Json | null;
          emergency_contact_json: Json | null;
          preferred_language: string | null;
        };
        Insert: {
          user_id: string;
          full_name: string;
          dob?: string | null;
          sex_at_birth?: string | null;
          gender_identity?: string | null;
          address_json?: Json | null;
          emergency_contact_json?: Json | null;
          preferred_language?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patient_profile"]["Insert"]>;
      };
    };
  };
}
