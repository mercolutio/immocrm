"use server";

import { createClient } from "@/lib/supabase/server";

interface RegisterInput {
  orgName: string;
  email: string;
  password: string;
}

export async function registerUser(input: RegisterInput): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { org_name: input.orgName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
