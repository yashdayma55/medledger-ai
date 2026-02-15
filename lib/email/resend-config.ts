/**
 * Resend config: dev override, and multiple senders (primary + secondary + tertiary).
 * Each extra sender has an email + API key + from; when sending to that email we use that key/from.
 */

export function getResendTo(actualRecipient: string): string {
  const override = process.env.RESEND_DEV_OVERRIDE_TO?.trim();
  return override && override.length > 0 ? override : actualRecipient;
}

export function isDevOverrideActive(): boolean {
  const override = process.env.RESEND_DEV_OVERRIDE_TO?.trim();
  return !!override && override.length > 0;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Which sender slot (2, 3, or 4) to use for this recipient, or 0 for primary. */
function getSenderSlotFor(recipient: string): 0 | 2 | 3 | 4 {
  const r = normalizeEmail(recipient);
  const secondary = process.env.RESEND_SECONDARY_EMAIL?.trim();
  const tertiary = process.env.RESEND_TERTIARY_EMAIL?.trim();
  const quaternary = process.env.RESEND_QUATERNARY_EMAIL?.trim();
  if (secondary && normalizeEmail(secondary) === r) return 2;
  if (tertiary && normalizeEmail(tertiary) === r) return 3;
  if (quaternary && normalizeEmail(quaternary) === r) return 4;
  return 0;
}

export function getResendFrom(recipient?: string): string {
  if (!recipient) return process.env.RESEND_FROM_EMAIL ?? "MedLedger <onboarding@resend.dev>";
  const slot = getSenderSlotFor(recipient);
  if (slot === 2) {
    const from2 = process.env.RESEND_FROM_EMAIL_2?.trim();
    if (from2) return from2;
  }
  if (slot === 3) {
    const from3 = process.env.RESEND_FROM_EMAIL_3?.trim();
    if (from3) return from3;
  }
  if (slot === 4) {
    const from4 = process.env.RESEND_FROM_EMAIL_4?.trim();
    if (from4) return from4;
  }
  return process.env.RESEND_FROM_EMAIL ?? "MedLedger <onboarding@resend.dev>";
}

export function getResendApiKey(recipient?: string): string | undefined {
  if (!recipient) return process.env.RESEND_API_KEY;
  const slot = getSenderSlotFor(recipient);
  if (slot === 2) {
    const key2 = process.env.RESEND_API_KEY_2?.trim();
    if (key2) return key2;
  }
  if (slot === 3) {
    const key3 = process.env.RESEND_API_KEY_3?.trim();
    if (key3) return key3;
  }
  if (slot === 4) {
    const key4 = process.env.RESEND_API_KEY_4?.trim();
    if (key4) return key4;
  }
  return process.env.RESEND_API_KEY;
}
