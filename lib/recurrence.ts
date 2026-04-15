import type { TaskRecurrence } from "./types"

export function addInterval(dateStr: string, recurrence: TaskRecurrence): string | null {
  if (recurrence === 'none') return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null

  switch (recurrence) {
    case 'daily':   d.setDate(d.getDate() + 1); break
    case 'weekly':  d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break
  }

  const cap = new Date()
  cap.setFullYear(cap.getFullYear() + 1)
  if (d.getTime() > cap.getTime()) return null

  return d.toISOString()
}

export function shouldSpawnNextInstance(
  oldDue: string | null,
  recurrence: TaskRecurrence,
  recurrenceEnd: string | null,
): string | null {
  if (recurrence === 'none' || !oldDue) return null
  const next = addInterval(oldDue, recurrence)
  if (!next) return null
  if (recurrenceEnd) {
    const nextDate = new Date(next)
    const endDate = new Date(recurrenceEnd)
    if (nextDate.getTime() > endDate.getTime()) return null
  }
  return next
}
