import { createHash, randomInt, randomBytes } from "crypto";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 15;
const RESET_TOKEN_EXPIRY_MINUTES = 60;

export function generateOtpCode(): string {
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += randomInt(0, 10).toString();
  }
  return code;
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function verifyOtpHash(code: string, hash: string): boolean {
  return createHash("sha256").update(code).digest("hex") === hash;
}

export function getOtpExpiry(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + OTP_EXPIRY_MINUTES);
  return d;
}

export { OTP_EXPIRY_MINUTES };

/** For password reset link: random token, store hash in DB, put raw token in URL. */
export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

export function getResetTokenExpiry(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES);
  return d;
}

export { RESET_TOKEN_EXPIRY_MINUTES };
