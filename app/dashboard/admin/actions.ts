"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { deleteSession } from "@/lib/auth/session";

export async function signOut(): Promise<never> {
  await deleteSession();
  redirect("/");
}

export async function verifyProvider(providerUserId: string): Promise<never> {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superuser")) {
    redirect("/auth/admin");
  }

  if (!supabaseAdmin) {
    redirect("/dashboard/admin?error=Server+error");
  }
  const db = supabaseAdmin;

  const now = new Date().toISOString();

  await db
    .from("provider_profile")
    .update({
      verification_status: "verified",
      verified_at: now,
      verified_by: session.sub,
    })
    .eq("user_id", providerUserId);

  await db.from("admin_actions").insert({
    admin_user_id: session.sub,
    target_user_id: providerUserId,
    action: "verify_provider",
    reason: "Admin approved provider",
  });

  redirect("/dashboard/admin");
}

export async function rejectProvider(providerUserId: string): Promise<never> {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superuser")) {
    redirect("/auth/admin");
  }

  if (!supabaseAdmin) {
    redirect("/dashboard/admin?error=Server+error");
  }
  const db = supabaseAdmin;

  await db
    .from("provider_profile")
    .update({
      verification_status: "rejected",
      verified_by: session.sub,
    })
    .eq("user_id", providerUserId);

  await db.from("admin_actions").insert({
    admin_user_id: session.sub,
    target_user_id: providerUserId,
    action: "reject_provider",
    reason: "Admin rejected provider",
  });

  redirect("/dashboard/admin");
}
