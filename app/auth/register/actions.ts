"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RegisterInput {
  orgName: string;
  email: string;
  password: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "org";
}

export async function registerUser(input: RegisterInput): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { org_name: input.orgName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  const userId = data.user?.id;
  if (userId) {
    const admin = createAdminClient();
    const slug = `${slugify(input.orgName)}-${userId.slice(0, 8)}`;
    const { data: org, error: orgErr } = await admin.from("organizations")
      .insert({ name: input.orgName, slug })
      .select().single();
    if (orgErr) return { error: "Organisation konnte nicht angelegt werden: " + orgErr.message };
    if (org) {
      await admin.from("organization_members").insert({
        organization_id: org.id, user_id: userId, role: "owner",
      });
    }
  }

  return { error: null };
}
