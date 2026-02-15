"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/auth/password";
import {
  generateOtpCode,
  hashOtp,
  getOtpExpiry,
  OTP_EXPIRY_MINUTES,
} from "@/lib/auth/otp";
import { sendVerificationOtpEmail } from "@/lib/email/send-otp";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerPatient(formData: FormData): Promise<never> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string)?.trim() ?? "";
  const fullName = (formData.get("full_name") as string)?.trim();
  const dobRaw = formData.get("dob") as string | null;
  const sexAtBirth = (formData.get("sex_at_birth") as string)?.trim() || null;
  const preferredLanguage = (formData.get("preferred_language") as string)?.trim() || null;

  const errorRedirect = (message: string): never =>
    redirect(`/auth/register/patient?error=${encodeURIComponent(message)}`);

  if (!email || !EMAIL_REGEX.test(email)) {
    errorRedirect("Please enter a valid email address.");
  }
  if (!password || password.length < 8) {
    errorRedirect("Password must be at least 8 characters.");
  }
  if (!fullName || fullName.length < 2) {
    errorRedirect("Full name is required (at least 2 characters).");
  }

  const dob = dobRaw && dobRaw.length > 0 ? dobRaw : null;

  if (!supabaseAdmin) {
    errorRedirect("Server configuration error. Please try again later.");
  }
  const db = supabaseAdmin!;

  const { data: existingUser } = await db
    .from("users")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  let userId: string;

  if (existingUser) {
    if (String(existingUser.role).toLowerCase() !== "patient") {
      errorRedirect("An account with this email already exists.");
    }
    userId = existingUser.id;
    const password_hash = await hashPassword(password);
    const now = new Date().toISOString();
    const { error: updateError } = await db
      .from("users")
      .update({
        password_hash,
        status: "pending",
        email_verified_at: null,
        updated_at: now,
      })
      .eq("id", userId);
    if (updateError) {
      console.error("User update error (re-register):", updateError);
      errorRedirect("Registration failed. Please try again.");
    }
    await db.from("verification_tokens").delete().eq("user_id", userId);
  } else {
    const password_hash = await hashPassword(password);
    const { data: user, error: userError } = await db
      .from("users")
      .insert({
        email,
        password_hash,
        role: "patient",
        status: "pending",
      })
      .select("id")
      .single();

    if (userError || !user) {
      console.error("User insert error:", userError);
      errorRedirect("Registration failed. Please try again.");
    }
    userId = user!.id;
  }

  const profileRow = {
    user_id: userId,
    full_name: fullName,
    dob: dob || null,
    sex_at_birth: sexAtBirth || null,
    preferred_language: preferredLanguage || null,
  };

  const { error: profileError } = existingUser
    ? await db
        .from("patient_profile")
        .upsert(profileRow, { onConflict: "user_id" })
    : await db.from("patient_profile").insert(profileRow);

  if (profileError) {
    console.error("Patient profile insert/upsert error:", profileError);
    if (!existingUser) {
      await db.from("users").delete().eq("id", userId);
    }
    errorRedirect("Registration failed. Please try again.");
  }

  const otpCode = generateOtpCode();
  const tokenHash = hashOtp(otpCode);
  const expiresAt = getOtpExpiry();

  const { error: tokenError } = await db.from("verification_tokens").insert({
    user_id: userId,
    purpose: "email_verify",
    token_hash: tokenHash,
    channel: "email",
    sent_to: email,
    expires_at: expiresAt.toISOString(),
  });

  if (tokenError) {
    console.error("Verification token insert error:", tokenError);
    errorRedirect("Registration succeeded but we could not send a verification code. Please try again later.");
  }

  const emailResult = await sendVerificationOtpEmail(
    email,
    otpCode,
    OTP_EXPIRY_MINUTES
  );

  if (!emailResult.success) {
    await db.from("verification_tokens").delete().eq("user_id", userId).eq("purpose", "email_verify");
    if (!existingUser) {
      await db.from("patient_profile").delete().eq("user_id", userId);
      await db.from("users").delete().eq("id", userId);
    }
    errorRedirect(
      emailResult.error ?? "Could not send verification email. Check configuration and try again."
    );
  }

  redirect(`/auth/verify-email?email=${encodeURIComponent(email)}`);
}
