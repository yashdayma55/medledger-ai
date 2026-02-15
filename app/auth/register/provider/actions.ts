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
const NPI_REGEX = /^\d{10}$/;

export async function registerProvider(formData: FormData): Promise<never> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string)?.trim() ?? "";
  const displayName = (formData.get("display_name") as string)?.trim();
  const npiNumber = (formData.get("npi_number") as string)?.trim().replace(/\s/g, "");
  const clinicName = (formData.get("clinic_name") as string)?.trim() || null;
  const specialtyPrimary = (formData.get("specialty_primary") as string)?.trim() || null;

  const errorRedirect = (message: string): never =>
    redirect(`/auth/register/provider?error=${encodeURIComponent(message)}`);

  if (!email || !EMAIL_REGEX.test(email)) {
    errorRedirect("Please enter a valid email address.");
  }
  if (!password || password.length < 8) {
    errorRedirect("Password must be at least 8 characters.");
  }
  if (!displayName || displayName.length < 2) {
    errorRedirect("Display name is required (at least 2 characters).");
  }
  if (!npiNumber || !NPI_REGEX.test(npiNumber)) {
    errorRedirect("NPI number must be exactly 10 digits (no API check—for our records only).");
  }

  if (!supabaseAdmin) {
    errorRedirect("Server configuration error. Please try again later.");
  }
  const db = supabaseAdmin!;

  const { data: existingUser } = await db
    .from("users")
    .select("id, email_verified_at, status")
    .eq("email", email)
    .maybeSingle();

  // If user exists (e.g. they were a patient first), add provider profile instead of blocking
  if (existingUser) {
    const { data: existingProvider } = await db
      .from("provider_profile")
      .select("user_id")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    if (existingProvider) {
      errorRedirect("A doctor account with this email already exists.");
    }

    const { data: existingNpi } = await db
      .from("provider_profile")
      .select("user_id")
      .eq("npi_number", npiNumber)
      .maybeSingle();

    if (existingNpi) {
      errorRedirect("This NPI number is already registered.");
    }

    const password_hash = await hashPassword(password);

    // Add provider profile and switch role to provider (same user, now has doctor access)
    await db
      .from("users")
      .update({
        password_hash,
        role: "provider",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingUser.id);

    const { error: profileError } = await db.from("provider_profile").insert({
      user_id: existingUser.id,
      display_name: displayName,
      npi_number: npiNumber,
      verification_status: "pending",
      clinic_name: clinicName,
      specialty_primary: specialtyPrimary,
    });

    if (profileError) {
      console.error("Provider profile insert error:", profileError);
      errorRedirect("Registration failed. Please try again.");
    }

    // If already verified (e.g. had patient account), skip OTP and go straight to login
    if (existingUser.email_verified_at && existingUser.status === "active") {
      redirect(`/auth/login/doctor?message=${encodeURIComponent("Doctor profile added. You can now sign in.")}`);
    }

    const otpCode = generateOtpCode();
    const tokenHash = hashOtp(otpCode);
    const expiresAt = getOtpExpiry();

    const { error: tokenError } = await db.from("verification_tokens").insert({
      user_id: existingUser.id,
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

    const emailResult = await sendVerificationOtpEmail(email, otpCode, OTP_EXPIRY_MINUTES);

    if (!emailResult.success) {
      await db.from("verification_tokens").delete().eq("user_id", existingUser.id).eq("purpose", "email_verify");
      await db.from("provider_profile").delete().eq("user_id", existingUser.id);
      errorRedirect(
        emailResult.error ?? "Could not send verification email. Check configuration and try again."
      );
    }

    redirect(`/auth/verify-email?email=${encodeURIComponent(email)}&role=provider`);
  }

  const { data: existingNpi } = await db
    .from("provider_profile")
    .select("user_id")
    .eq("npi_number", npiNumber)
    .maybeSingle();

  if (existingNpi) {
    errorRedirect("This NPI number is already registered.");
  }

  const password_hash = await hashPassword(password);
  const { data: user, error: userError } = await db
    .from("users")
    .insert({
      email,
      password_hash,
      role: "provider",
      status: "pending",
    })
    .select("id")
    .single();

  if (userError || !user) {
    console.error("User insert error:", userError);
    errorRedirect("Registration failed. Please try again.");
  }
  const userId = user!.id;

  const { error: profileError } = await db.from("provider_profile").insert({
    user_id: userId,
    display_name: displayName,
    npi_number: npiNumber,
    verification_status: "pending",
    clinic_name: clinicName,
    specialty_primary: specialtyPrimary,
  });

  if (profileError) {
    console.error("Provider profile insert error:", profileError);
    await db.from("users").delete().eq("id", userId);
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

  const emailResult = await sendVerificationOtpEmail(email, otpCode, OTP_EXPIRY_MINUTES);

  if (!emailResult.success) {
    await db.from("verification_tokens").delete().eq("user_id", userId).eq("purpose", "email_verify");
    await db.from("provider_profile").delete().eq("user_id", userId);
    await db.from("users").delete().eq("id", userId);
    errorRedirect(
      emailResult.error ?? "Could not send verification email. Check configuration and try again."
    );
  }

  redirect(`/auth/verify-email?email=${encodeURIComponent(email)}&role=provider`);
}
