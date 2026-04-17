"use client";

import { useCallback, useEffect, useState } from "react";

type NextBestAction = {
  action: string;
  reason: string;
  urgency: "heute" | "diese woche" | "diesen monat";
  suggestedScript: string;
};

type Insight = {
  id: string;
  score: number | null;
  score_label: string | null;
  signals: string[];
  next_action: NextBestAction | null;
  computed_at: string;
  cost_eur: number | null;
};

type State =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "insufficient"; hint: string }
  | { kind: "ready"; insight: Insight }
  | { kind: "error"; message: string; status?: number };

const URGENCY_ORDER: NextBestAction["urgency"][] = ["heute", "diese woche", "diesen monat"];
const URGENCY_LABEL: Record<NextBestAction["urgency"], string> = {
  heute: "Heute",
  "diese woche": "Diese Woche",
  "diesen monat": "Diesen Monat",
};

function labelColor(label: string | null): string {
  switch (label) {
    case "abschlussreif": return "#15803d";
    case "heiß": return "#C2692A";
    case "aktiv": return "#18120E";
    case "lauwarm": return "#8B6E4E";
    case "kalt": return "#6B5B50";
    default: return "#6B5B50";
  }
}

function formatTimeAgo(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `vor ${diffD} Tag${diffD === 1 ? "" : "en"}`;
  return new Date(iso).toLocaleDateString("de-DE");
}

export default function ContactInsightsPanel({ contactId }: { contactId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/contacts/${contactId}/insights`, { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setState({ kind: "error", message: body?.error ?? "Fehler beim Laden.", status: res.status });
          return;
        }
        const body = await res.json();
        if (cancelled) return;
        if (body.insight) setState({ kind: "ready", insight: body.insight as Insight });
        else setState({ kind: "empty" });
      } catch (e) {
        if (cancelled) return;
        setState({ kind: "error", message: (e as Error).message });
      }
    }
    setState({ kind: "loading" });
    load();
    return () => { cancelled = true; };
  }, [contactId]);

  const recompute = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/insights`, { method: "POST" });
      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      let body: Record<string, unknown> = {};
      if (contentType.includes("application/json") && raw) {
        try { body = JSON.parse(raw); } catch { /* fall through */ }
      }
      if (!res.ok) {
        const detail = (body.error as string | undefined)
          ?? (raw ? `${res.status} · ${raw.slice(0, 200)}` : `HTTP ${res.status}`);
        console.error("[insights] server error", { status: res.status, body, raw: raw.slice(0, 500) });
        setState({ kind: "error", message: detail, status: res.status });
        return;
      }
      if (body.insufficientData) {
        setState({ kind: "insufficient", hint: (body.hint as string) ?? "Zu wenig Daten." });
        return;
      }
      if (body.insight) setState({ kind: "ready", insight: body.insight as Insight });
      else setState({ kind: "empty" });
    } catch (e) {
      console.error("[insights] fetch threw", e);
      setState({ kind: "error", message: (e as Error).message });
    } finally {
      setRefreshing(false);
    }
  }, [contactId]);

  const headerRight = (
    <button
      onClick={recompute}
      disabled={refreshing}
      title="Neu analysieren"
      className="h-icon-btn"
      style={{
        marginLeft: "auto",
        width: 26,
        height: 26,
        borderRadius: 6,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--border)",
        background: "var(--card, #fff)",
        color: "var(--t2)",
        cursor: refreshing ? "wait" : "pointer",
        opacity: refreshing ? 0.5 : 1,
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: refreshing ? "ai-spin 1.2s linear infinite" : undefined,
        }}
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    </button>
  );

  return (
    <div
      style={{
        background: "var(--card, #fff)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <style>{`@keyframes ai-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: "flex", alignItems: "center" }}>
        <div className="section-head">
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a5 5 0 0 0-5 5c0 1.9 1.1 3.5 2.7 4.3V14a2 2 0 0 0 2 2h.6a2 2 0 0 0 2-2v-2.7A5 5 0 0 0 12 2z" />
            <path d="M9 20h6M10 22h4" />
          </svg>
          KI-Einschätzung
        </div>
        {headerRight}
      </div>

      {state.kind === "loading" && (
        <div style={{ fontSize: 12.5, color: "var(--t2)" }}>Lade…</div>
      )}

      {state.kind === "empty" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12.5, color: "var(--t2)", lineHeight: 1.5 }}>
            Noch keine Analyse für diesen Kontakt. Claude liest Suchprofile, Aktivitäten, Notizen und Deals — und gibt dir einen Score + nächsten Schritt.
          </div>
          <button
            onClick={recompute}
            disabled={refreshing}
            className="btn-primary"
            style={{ alignSelf: "flex-start", fontSize: 12.5 }}
          >
            {refreshing ? "KI analysiert…" : "Jetzt analysieren"}
          </button>
        </div>
      )}

      {state.kind === "insufficient" && (
        <div style={{ fontSize: 12.5, color: "var(--t2)", lineHeight: 1.5 }}>
          <div style={{ fontWeight: 500, color: "var(--t1)", marginBottom: 4 }}>Zu wenig Daten</div>
          {state.hint}
        </div>
      )}

      {state.kind === "error" && (
        <div style={{ fontSize: 12.5, color: "#991B1B", lineHeight: 1.5 }}>
          {state.status === 429 ? "Tageslimit für KI-Analysen erreicht. Morgen geht's weiter." : state.message}
          <div style={{ marginTop: 8 }}>
            <button onClick={recompute} disabled={refreshing} className="btn-secondary" style={{ fontSize: 12 }}>
              Erneut versuchen
            </button>
          </div>
        </div>
      )}

      {state.kind === "ready" && state.insight.score != null && (
        <ReadyBody insight={state.insight} refreshing={refreshing} />
      )}
    </div>
  );
}

function ReadyBody({ insight, refreshing }: { insight: Insight; refreshing: boolean }) {
  const nba = insight.next_action;
  const urgency = nba?.urgency ?? "diesen monat";
  const isToday = urgency === "heute";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, opacity: refreshing ? 0.55 : 1, transition: "opacity .2s" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <div
          style={{
            fontFamily: "var(--font-heading, 'Playfair Display', serif)",
            fontSize: 46,
            fontWeight: 500,
            letterSpacing: "-1.5px",
            color: "var(--t1)",
            lineHeight: 1,
          }}
        >
          {insight.score}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: labelColor(insight.score_label),
              textTransform: "capitalize",
            }}
          >
            {insight.score_label ?? "—"}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--t3, #8B7A6E)" }}>
            Score · {formatTimeAgo(insight.computed_at)}
          </div>
        </div>
      </div>

      {insight.signals.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="section-head muted" style={{ fontSize: 10 }}>Warum?</div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
            {insight.signals.map((s, i) => (
              <li
                key={i}
                style={{
                  fontSize: 12.5,
                  color: "var(--t2)",
                  lineHeight: 1.4,
                  paddingLeft: 12,
                  position: "relative",
                }}
              >
                <span style={{ position: "absolute", left: 0, top: 7, width: 4, height: 4, borderRadius: "50%", background: "var(--t3, #8B7A6E)" }} />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {nba && (
        <div
          style={{
            background: isToday ? "var(--accent-soft, #F0EBE4)" : "var(--bg2, #F0EBE4)",
            borderRadius: 10,
            padding: "12px 14px",
            boxShadow: isToday ? "inset 3px 0 0 0 var(--accent)" : "inset 3px 0 0 0 var(--border-strong)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: isToday ? "var(--accent)" : "var(--t2)",
              }}
            >
              Nächster Schritt · {URGENCY_LABEL[URGENCY_ORDER.includes(urgency) ? urgency : "diesen monat"]}
            </div>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--t1)", lineHeight: 1.35 }}>
            {nba.action}
          </div>
          <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.5 }}>
            {nba.reason}
          </div>
          {nba.suggestedScript && (
            <div
              style={{
                marginTop: 4,
                padding: "8px 10px",
                background: "var(--card, #fff)",
                borderRadius: 6,
                border: "1px solid var(--border)",
                fontSize: 12.5,
                color: "var(--t1)",
                lineHeight: 1.55,
                fontStyle: "italic",
              }}
            >
              &bdquo;{nba.suggestedScript}&ldquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
