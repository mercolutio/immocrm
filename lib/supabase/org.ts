import type { SupabaseClient } from "@supabase/supabase-js"

/** Gibt die primäre Organization-ID des aktuell eingeloggten Users zurück. */
export async function getMyOrgId(client: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await client
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .single()
  return data?.organization_id ?? null
}
