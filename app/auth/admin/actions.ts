"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const errorRedirect = (message: string): never =>
  redirect(`/auth/admin?error=${encodeURIComponent(message)}`);

export async function loginAdmin(formData: FormData): Promise<never> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    errorRedirect("Please enter your email and password.");
  }

  if (!supabaseAdmin) {
    errorRedirect("Server configuration error. Please try again later.");
  }
  const db = supabaseAdmin!;

  const { data: user, error } = await db
    .from("users")
    .select("id, email, role, password_hash, status")
    .eq("email", email)
    .in("role", ["admin", "superuser"])
    .maybeSingle();

  if (error || !user) {
    errorRedirect("Invalid email or password.");
  }
  const u = user!;
  if (u.status !== "active") {
    errorRedirect("Your account is not active.");
  }
  if (!u.password_hash) {
    errorRedirect("Invalid email or password.");
  }

  const valid = await verifyPassword(password, u.password_hash);
  if (!valid) {
    errorRedirect("Invalid email or password.");
  }

  const now = new Date().toISOString();
  await db.from("users").update({ last_login_at: now, updated_at: now }).eq("id", u.id);

  await createSession(u.id, u.email, u.role);
  redirect("/dashboard/admin");
}

export async function createFirstAdmin(formData: FormData): Promise<never> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const displayName = (formData.get("display_name") as string)?.trim();

  if (!email || !EMAIL_REGEX.test(email)) {
    errorRedirect("Please enter a valid email address.");
  }
  if (!password || password.length < 8) {
    errorRedirect("Password must be at least 8 characters.");
  }
  if (!displayName || displayName.length < 2) {
    errorRedirect("Display name is required (at least 2 characters).");
  }

  if (!supabaseAdmin) {
    errorRedirect("Server configuration error. Please try again later.");
  }
  const db = supabaseAdmin!;

  const { count } = await db
    .from("users")
    .select("id", { count: "exact", head: true })
    .in("role", ["admin", "superuser"]);

  if ((count ?? 0) > 0) {
    errorRedirect("An admin already exists. Please use the login form.");
  }

  const { data: existingUser } = await db.from("users").select("id").eq("email", email).maybeSingle();

  if (existingUser) {
    // Promote existing user (e.g. patient or doctor) to super admin
    const { data: existingAdmin } = await db
      .from("admin_profile")
      .select("user_id")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    if (existingAdmin) {
      errorRedirect("This account is already a super admin. Use the login form.");
    }

    const password_hash = await hashPassword(password);
    const now = new Date().toISOString();

    await db
      .from("users")
      .update({
        password_hash,
        role: "superuser",
        status: "active",
        updated_at: now,
      })
      .eq("id", existingUser.id);

    const { error: profileError } = await db.from("admin_profile").insert({
      user_id: existingUser.id,
      display_name: displayName,
      admin_level: "super_admin",
    });

    if (profileError) {
      console.error("Admin profile insert error:", profileError);
      errorRedirect("Failed to create admin profile. Ensure migration 003 is run.");
    }

    await createSession(existingUser.id, email, "superuser");
    redirect("/dashboard/admin");
  }

  const password_hash = await hashPassword(password);

  const { data: user, error: userError } = await db
    .from("users")
    .insert({
      email,
      password_hash,
      role: "superuser",
      status: "active",
      email_verified_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (userError || !user) {
    console.error("User insert error:", userError);
    errorRedirect("Failed to create admin. Please try again.");
  }

  const { error: profileError } = await db.from("admin_profile").insert({
    user_id: user!.id,
    display_name: displayName,
    admin_level: "super_admin",
  });

  if (profileError) {
    console.error("Admin profile insert error:", profileError);
    await db.from("users").delete().eq("id", user!.id);
    errorRedirect("Failed to create admin profile. Ensure migration 003 is run.");
  }

  await createSession(user!.id, email, "superuser");
  redirect("/dashboard/admin");
}
