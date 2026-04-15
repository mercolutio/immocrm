"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Zählt die fälligen/überfälligen offenen Tasks des aktuellen Users.
 * Regel: status ≠ 'done', due_date ≤ heute (23:59),
 * eigene Tasks (assigned_to = me ODER (assigned_to IS NULL AND user_id = me)).
 * Abonniert Realtime-Changes der tasks-Tabelle; Fallback: 60s Poll bei Channel-Error.
 */
export function useOverdueTaskCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let pollId: ReturnType<typeof setInterval> | null = null

    async function fetchCount() {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id
      if (!uid) {
        if (!cancelled) setCount(0)
        return
      }
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      const { count: c } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .neq("status", "done")
        .not("due_date", "is", null)
        .lte("due_date", end.toISOString())
        .or(`assigned_to.eq.${uid},and(assigned_to.is.null,user_id.eq.${uid})`)
      if (!cancelled) setCount(c ?? 0)
    }

    fetchCount()

    const channel = supabase
      .channel("overdue-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => fetchCount(),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          if (!pollId) pollId = setInterval(fetchCount, 60_000)
        }
      })

    return () => {
      cancelled = true
      if (pollId) clearInterval(pollId)
      supabase.removeChannel(channel)
    }
  }, [])

  return count
}
