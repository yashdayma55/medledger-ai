-- =========================================
-- Extensions (Supabase has uuid-ossp by default)
-- =========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- ENUMS
-- =========================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('patient','provider','admin','superuser');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('pending','active','disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('unverified','pending','verified','rejected','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE token_purpose AS ENUM ('email_verify','password_reset','login_otp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE token_channel AS ENUM ('email','sms','app');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE access_scope AS ENUM ('read_summary','read_all','upload_docs','annotate','emergency_breakglass');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE access_status AS ENUM ('pending','active','revoked','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE grant_method AS ENUM ('otp','qr','manual','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================
-- USERS (Login Identity for both Patient & Doctor)
-- =========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  phone_e164 TEXT UNIQUE,
  password_hash TEXT,
  role user_role NOT NULL,
  status user_status NOT NULL DEFAULT 'pending',
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =========================================
-- AUTH SESSIONS
-- =========================================
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  device_id TEXT,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON auth_sessions(expires_at);

-- =========================================
-- TOKENS (Email verify / password reset / OTP)
-- =========================================
CREATE TABLE IF NOT EXISTS verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose token_purpose NOT NULL,
  token_hash TEXT NOT NULL,
  channel token_channel NOT NULL,
  sent_to TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tokens_user_purpose ON verification_tokens(user_id, purpose);
CREATE INDEX IF NOT EXISTS idx_tokens_expires ON verification_tokens(expires_at);

-- =========================================
-- PATIENT PROFILE
-- =========================================
CREATE TABLE IF NOT EXISTS patient_profile (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  dob DATE,
  sex_at_birth TEXT,
  gender_identity TEXT,
  address_json JSONB,
  emergency_contact_json JSONB,
  preferred_language TEXT
);

-- =========================================
-- PROVIDER PROFILE
-- =========================================
CREATE TABLE IF NOT EXISTS provider_profile (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  npi_number VARCHAR(10) NOT NULL UNIQUE,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  clinic_name TEXT,
  specialty_primary TEXT,
  practice_address_json JSONB,
  taxonomy_codes TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_provider_verification_status ON provider_profile(verification_status);

-- =========================================
-- PROVIDER VERIFICATION EVENTS
-- =========================================
CREATE TABLE IF NOT EXISTS provider_verification_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  query_payload JSONB NOT NULL,
  response_payload JSONB,
  result_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_verif_events_provider
  ON provider_verification_events(provider_user_id, created_at DESC);

-- =========================================
-- PATIENT -> PROVIDER ACCESS
-- =========================================
CREATE TABLE IF NOT EXISTS patient_provider_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope access_scope NOT NULL,
  status access_status NOT NULL DEFAULT 'pending',
  grant_method grant_method NOT NULL,
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_user_id, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_access_provider_status ON patient_provider_access(provider_user_id, status);
CREATE INDEX IF NOT EXISTS idx_access_patient_status ON patient_provider_access(patient_user_id, status);
CREATE INDEX IF NOT EXISTS idx_access_expires ON patient_provider_access(expires_at);

-- =========================================
-- RLS (optional: enable and add policies per table as needed)
-- =========================================
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Add policies when you use Supabase Auth or need row-level security.
