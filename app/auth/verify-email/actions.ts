"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyOtpHash } from "@/lib/auth/otp";

export async function verifyEmailOtp(formData: FormData): Promise<never> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const code = (formData.get("code") as string)?.trim().replace(/\s/g, "");

  const errorRedirect = (message: string): never =>
    redirect(`/auth/verify-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(message)}`);

  if (!email) {
    redirect("/auth/verify-email?error=" + encodeURIComponent("Email is required."));
  }
  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    errorRedirect("Please enter the 6-digit code from your email.");
  }

  if (!supabaseAdmin) {
    errorRedirect("Server configuration error. Please try again later.");
  }
  const db = supabaseAdmin!;

  const { data: user, error: userError } = await db
    .from("users")
    .select("id, email_verified_at, role")
    .eq("email", email)
    .maybeSingle();

  if (userError || !user) {
    errorRedirect("Account not found. Please register first.");
  }
  const targetUser = user!;
  const role = targetUser.role as string;

  if (targetUser.email_verified_at) {
    errorRedirect("This email is already verified. You can log in.");
  }

  const { data: tokens } = await db
    .from("verification_tokens")
    .select("id, token_hash, consumed_at, expires_at")
    .eq("user_id", targetUser.id)
    .eq("purpose", "email_verify")
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const verificationToken = tokens?.[0];
  if (!verificationToken) {
    errorRedirect("No verification code found. Please request a new one from registration.");
  }
  const tokenRecord = verificationToken!;

  if (new Date(tokenRecord.expires_at) < new Date()) {
    errorRedirect("This code has expired. Please register again or request a new code.");
  }

  if (!verifyOtpHash(code, tokenRecord.token_hash)) {
    errorRedirect("Invalid code. Please check and try again.");
  }

  const now = new Date().toISOString();
  const { error: updateUserError } = await db
    .from("users")
    .update({
      email_verified_at: now,
      status: "active",
      updated_at: now,
    })
    .eq("id", targetUser.id);

  if (updateUserError) {
    console.error("Update user error:", updateUserError);
    errorRedirect("Verification failed. Please try again.");
  }

  await db
    .from("verification_tokens")
    .update({ consumed_at: now })
    .eq("id", tokenRecord.id);

  redirect(`/auth/verify-email?success=1&role=${encodeURIComponent(role)}`);
}
