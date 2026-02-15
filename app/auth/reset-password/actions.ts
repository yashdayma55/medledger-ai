"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/auth/password";
import { verifyOtpHash } from "@/lib/auth/otp";

export async function resetPassword(formData: FormData): Promise<never> {
  const token = (formData.get("token") as string)?.trim();
  const password = (formData.get("password") as string)?.trim() ?? "";
  const confirmPassword = (formData.get("confirm_password") as string)?.trim() ?? "";

  const errorRedirect = (message: string): never =>
    redirect(
      `/auth/reset-password?token=${encodeURIComponent(token || "")}&error=${encodeURIComponent(message)}`
    );

  if (!token) {
    redirect("/auth/forgot-password?error=Invalid or missing reset link.");
  }
  if (!password || password.length < 8) {
    errorRedirect("Password must be at least 8 characters.");
  }
  if (password !== confirmPassword) {
    errorRedirect("Passwords do not match.");
  }

  if (!supabaseAdmin) {
    errorRedirect("Server configuration error. Please try again later.");
  }
  const db = supabaseAdmin!;

  const { data: tokens } = await db
    .from("verification_tokens")
    .select("id, user_id, token_hash, expires_at")
    .eq("purpose", "password_reset")
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const verificationToken = tokens?.find((t) => verifyOtpHash(token, t.token_hash));
  if (!verificationToken) {
    errorRedirect("Invalid or expired reset link. Please request a new one.");
  }
  const tokenRecord = verificationToken!;
  if (new Date(tokenRecord.expires_at) < new Date()) {
    errorRedirect("This reset link has expired. Please request a new one.");
  }

  const password_hash = await hashPassword(password);
  const now = new Date().toISOString();

  const { error: updateError } = await db
    .from("users")
    .update({
      password_hash,
      updated_at: now,
      status: "active",
    })
    .eq("id", tokenRecord.user_id);

  if (updateError) {
    console.error("Password reset update error:", updateError);
    errorRedirect("Could not update password. Please try again or request a new reset link.");
  }

  await db.from("verification_tokens").update({ consumed_at: now }).eq("id", tokenRecord.id);

  redirect("/auth/login/patient?message=Password reset successfully. Please sign in.");
}
