"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { OrganizationMember, Organization } from "@/lib/types"

export interface OrganizationContext {
  organization: Organization | null
  members: OrganizationMember[]
  memberProfiles: Record<string, { name: string; email: string }>
  loading: boolean
  currentUserId: string | null
}

/**
 * Lädt die erste Organisation des aktuellen Users (MVP: 1 Org pro User),
 * dessen Members und Basisprofile (Name aus user_metadata, E-Mail).
 */
export function useOrganization(): OrganizationContext {
  const [ctx, setCtx] = useState<OrganizationContext>({
    organization: null,
    members: [],
    memberProfiles: {},
    loading: true,
    currentUserId: null,
  })

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id
      if (!uid) {
        if (!cancelled) setCtx((c) => ({ ...c, loading: false }))
        return
      }

      const { data: memRow } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", uid)
        .limit(1)
        .single()
      const orgId = memRow?.organization_id
      if (!orgId) {
        if (!cancelled) setCtx((c) => ({ ...c, loading: false, currentUserId: uid }))
        return
      }

      const [{ data: org }, { data: members }] = await Promise.all([
        supabase.from("organizations").select("*").eq("id", orgId).single(),
        supabase.from("organization_members").select("*").eq("organization_id", orgId),
      ])

      // Member-Profile best-effort via User-RPC (not available) — fallback: own email only.
      const profiles: Record<string, { name: string; email: string }> = {}
      profiles[uid] = {
        name: String(auth.user?.user_metadata?.full_name ?? auth.user?.email ?? ""),
        email: String(auth.user?.email ?? ""),
      }

      if (!cancelled) {
        setCtx({
          organization: (org as Organization) ?? null,
          members: (members ?? []) as OrganizationMember[],
          memberProfiles: profiles,
          loading: false,
          currentUserId: uid,
        })
      }
    })()

    return () => { cancelled = true }
  }, [])

  return ctx
}
