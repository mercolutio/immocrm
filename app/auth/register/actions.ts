"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function registerUser(formData: {
  orgName: string;
  email: string;
  password: string;
}) {
  const admin = createAdminClient();

  // 1. Nutzer via Admin-API erstellen (ohne E-Mail-Bestätigung)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true, // direkt bestätigen
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Registrierung fehlgeschlagen." };
  }

  // 2. Organisation anlegen (als Admin damit RLS kein Problem ist)
  const slug = formData.orgName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: formData.orgName, slug })
    .select()
    .single();

  if (orgError || !org) {
    return { error: "Organisation konnte nicht angelegt werden: " + orgError?.message };
  }

  // 3. Nutzer als Owner eintragen
  const { error: memberError } = await admin
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: authData.user.id,
      role: "owner",
    });

  if (memberError) {
    return { error: "Mitgliedschaft konnte nicht erstellt werden: " + memberError.message };
  }

  return { success: true };
}
