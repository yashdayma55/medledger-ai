"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateSecureToken, hashOtp, getResetTokenExpiry, RESET_TOKEN_EXPIRY_MINUTES } from "@/lib/auth/otp";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  const errorRedirect = (message: string) => {
    redirect(`/auth/forgot-password?error=${encodeURIComponent(message)}`);
  };
  const successRedirect = () => {
    redirect(`/auth/forgot-password?sent=1`);
  };

  if (!email || !EMAIL_REGEX.test(email)) {
    errorRedirect("Please enter a valid email address.");
  }

  if (!supabaseAdmin) {
    errorRedirect("Server configuration error. Please try again later.");
  }
  const db = supabaseAdmin!;

  const { data: user } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  // Always redirect to same "success" message to avoid email enumeration
  if (!user) {
    successRedirect();
  }

  const rawToken = generateSecureToken();
  const tokenHash = hashOtp(rawToken);
  const expiresAt = getResetTokenExpiry();

  await db.from("verification_tokens").insert({
    user_id: user!.id,
    purpose: "password_reset",
    token_hash: tokenHash,
    channel: "email",
    sent_to: email,
    expires_at: expiresAt.toISOString(),
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(rawToken)}`;

  await sendPasswordResetEmail(email, resetLink, RESET_TOKEN_EXPIRY_MINUTES);

  redirect(`/auth/forgot-password?sent=1`);
}
