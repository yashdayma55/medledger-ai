-- ============================================================
-- MedLedger-AI: Super Admin Schema
-- Admin profile, RBAC, admin actions, restrictions, audit
-- ============================================================

-- Add access_grant_otp to token_purpose (run manually if it fails: value may already exist)
-- ALTER TYPE token_purpose ADD VALUE IF NOT EXISTS 'access_grant_otp';

-- =====================
-- New ENUM Types
-- =====================
DO $$ BEGIN
  CREATE TYPE admin_action_type AS ENUM (
    'disable_user', 'enable_user', 'force_password_reset',
    'verify_provider', 'reject_provider', 'suspend_provider', 'reinstate_provider',
    'revoke_access', 'activate_access', 'expire_access', 'change_access_scope'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE restriction_type AS ENUM (
    'login_block', 'upload_block', 'view_phi_block', 'grant_access_block'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE access_override_action AS ENUM ('revoke','activate','expire','change_scope');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'view_doc','download_doc','view_summary','query_rag',
    'upload_doc','grant_access','revoke_access','parse_doc',
    'provider_verified','provider_rejected',
    'admin_action','policy_change','feature_flag_change'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE resource_type AS ENUM ('document','artifact','clinical_fact','access','user','policy','feature_flag');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================
-- Admin Profile
-- =====================
CREATE TABLE IF NOT EXISTS admin_profile (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  admin_level TEXT NOT NULL DEFAULT 'super_admin',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- RBAC
-- =====================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- =====================
-- Admin Actions
-- =====================
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  target_user_id UUID NOT NULL REFERENCES users(id),
  action admin_action_type NOT NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_target_time ON admin_actions(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_time ON admin_actions(admin_user_id, created_at DESC);

-- =====================
-- User Restrictions
-- =====================
CREATE TABLE IF NOT EXISTS user_restrictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restriction restriction_type NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  imposed_by UUID NOT NULL REFERENCES users(id),
  reason TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restrictions_target_active ON user_restrictions(target_user_id, status, ends_at);

-- =====================
-- Access Overrides
-- =====================
CREATE TABLE IF NOT EXISTS access_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  access_id UUID NOT NULL REFERENCES patient_provider_access(id) ON DELETE CASCADE,
  action access_override_action NOT NULL,
  old_scope access_scope,
  new_scope access_scope,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_overrides_access ON access_overrides(access_id, created_at DESC);

-- =====================
-- Feature Flags & System Policies
-- =====================
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_policies (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- Audit Events
-- =====================
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID NOT NULL REFERENCES users(id),
  patient_user_id UUID REFERENCES users(id),
  action audit_action NOT NULL,
  resource_type resource_type NOT NULL,
  resource_id UUID,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_patient_time ON audit_events(patient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor_time ON audit_events(actor_user_id, created_at DESC);
