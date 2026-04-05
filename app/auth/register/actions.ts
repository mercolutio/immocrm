"use server";

import { createClient } from "@supabase/supabase-js";

interface RegisterInput {
  orgName: string;
  email: string;
  password: string;
}

export async function registerUser(input: RegisterInput): Promise<{ error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: "Server-Konfiguration fehlt." };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Nutzer anlegen (ohne E-Mail-Bestätigung)
  const { error: userError } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { org_name: input.orgName },
  });

  if (userError) {
    return { error: userError.message };
  }

  return { error: null };
}
