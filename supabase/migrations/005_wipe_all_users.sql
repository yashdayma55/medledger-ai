-- ============================================================
-- Wipe all users and all dependent data
-- Run this to reset: removes every user and related rows everywhere.
-- ============================================================

-- Tables that reference users WITHOUT ON DELETE CASCADE must be cleared first.
-- Wrapped so missing tables (e.g. if 003 not applied) don't fail the script.

DO $$ BEGIN
  DELETE FROM access_overrides;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DELETE FROM admin_actions;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DELETE FROM user_restrictions;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DELETE FROM audit_events;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE feature_flags SET updated_by = NULL WHERE updated_by IS NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE system_policies SET updated_by = NULL WHERE updated_by IS NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

UPDATE provider_profile SET verified_by = NULL WHERE verified_by IS NOT NULL;

-- Delete all users; CASCADE removes: auth_sessions, verification_tokens,
-- patient_profile, provider_profile, admin_profile, user_roles,
-- provider_verification_events, patient_provider_access, patient_medical_records, etc.
DELETE FROM users;
