"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  reminder: "var(--badge-blue)",
  due_today: "var(--badge-orange)",
  overdue: "var(--red)",
  dependency_resolved: "var(--badge-green)",
};

const TYPE_ICONS: Record<string, JSX.Element> = {
  reminder: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  ),
  due_today: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  overdue: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  dependency_resolved: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
};

export default function NotificationBell() {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = useMemo(() => notifications.filter((n) => !n.read_at), [notifications]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications((data ?? []) as Notification[]);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, load]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }

  async function markAllRead() {
    const ids = unread.map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  function timeAgo(iso: string): string {
    const d = Date.now() - new Date(iso).getTime();
    const m = Math.floor(d / 60000);
    if (m < 1) return "gerade eben";
    if (m < 60) return `vor ${m} Min.`;
    const h = Math.floor(m / 60);
    if (h < 24) return `vor ${h} Std.`;
    const days = Math.floor(h / 24);
    return `vor ${days} Tag${days > 1 ? "en" : ""}`;
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "relative",
          width: 36, height: 36, borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.08)",
          background: open ? "var(--accent-soft)" : "var(--card)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--t2)",
          transition: "background 150ms ease, border-color 150ms ease",
          boxShadow: "0 1px 3px rgba(28,24,20,0.04)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unread.length > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            width: 16, height: 16, borderRadius: 8,
            background: "var(--red)", color: "white",
            fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--bg)",
          }}>
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="content-reveal"
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 360, maxHeight: 440,
            background: "var(--card)", borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 8px 30px rgba(28,24,20,0.12), 0 2px 8px rgba(28,24,20,0.06)",
            zIndex: 100,
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px 10px",
            borderBottom: "1px solid var(--border)",
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)" }}>Benachrichtigungen</span>
            {unread.length > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  fontSize: 11, color: "var(--accent)", background: "transparent",
                  border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                }}
              >
                Alle gelesen
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
                Keine Benachrichtigungen
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.read_at) markRead(n.id); }}
                  style={{
                    display: "flex", gap: 10, padding: "10px 16px",
                    cursor: n.read_at ? "default" : "pointer",
                    background: n.read_at ? "transparent" : "rgba(194,105,42,0.03)",
                    transition: "background 150ms ease",
                  }}
                  onMouseEnter={(e) => { if (!n.read_at) e.currentTarget.style.background = "rgba(194,105,42,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = n.read_at ? "transparent" : "rgba(194,105,42,0.03)"; }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: `${TYPE_COLORS[n.type] ?? "var(--t3)"}15`,
                    color: TYPE_COLORS[n.type] ?? "var(--t3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginTop: 1,
                  }}>
                    {TYPE_ICONS[n.type] ?? TYPE_ICONS.reminder}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: n.read_at ? 400 : 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.title}
                      </span>
                      {!n.read_at && <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--accent)", flexShrink: 0 }} />}
                    </div>
                    {n.body && (
                      <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</div>
                    )}
                    <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 3 }}>
                      {NOTIFICATION_TYPE_LABELS[n.type]} · {timeAgo(n.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
