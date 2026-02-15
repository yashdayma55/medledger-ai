"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const errorRedirect = (message: string): never =>
  redirect(`/auth/login/doctor?error=${encodeURIComponent(message)}`);

export async function loginDoctor(formData: FormData): Promise<never> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string)?.trim() ?? "";

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
    .maybeSingle();

  if (error || !user) {
    errorRedirect("Invalid email or password.");
  }
  const u = user!;
  const role = String(u.role).toLowerCase();
  const status = String(u.status).toLowerCase();

  if (role !== "provider") {
    if (role === "patient") {
      errorRedirect("This email is registered as a patient. Please use the patient login page.");
    }
    errorRedirect("Invalid email or password.");
  }
  if (status === "disabled") {
    errorRedirect("This account is disabled. Contact support.");
  }
  const hash = typeof u.password_hash === "string" ? u.password_hash : "";
  if (!hash) {
    errorRedirect("Invalid email or password.");
  }

  const valid = await verifyPassword(password, hash);
  if (!valid) {
    errorRedirect("Invalid email or password.");
  }

  const now = new Date().toISOString();
  await db.from("users").update({ last_login_at: now, updated_at: now }).eq("id", u.id);

  await createSession(u.id, u.email, u.role);
  redirect("/dashboard/doctor");
}
