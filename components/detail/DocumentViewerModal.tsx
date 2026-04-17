"use client";

import { useEffect, useState } from "react";
import type { Document } from "@/lib/types";

export default function DocumentViewerModal({
  docs,
  index,
  setIndex,
  onClose,
  onDownload,
  onDelete,
  getViewUrl,
}: {
  docs: Document[];
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
  onDownload: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  getViewUrl: (doc: Document) => Promise<string | null>;
}) {
  const current = docs[index];
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!current) return;
    setLoading(true);
    setUrl(null);
    getViewUrl(current).then((u) => {
      if (!cancelled) { setUrl(u); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && docs.length > 1) setIndex((index - 1 + docs.length) % docs.length);
      else if (e.key === "ArrowRight" && docs.length > 1) setIndex((index + 1) % docs.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, docs.length, onClose, setIndex]);

  if (!current) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "dialogBackdropIn 200ms ease both",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "min(1200px, 94vw)", height: "94vh",
          background: "var(--card)", borderRadius: 20, overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0, gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {current.file_name}
            </div>
            {docs.length > 1 && (
              <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
                {index + 1} / {docs.length}
              </div>
            )}
          </div>

          <button
            onClick={() => onDownload(current)}
            style={{
              height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--bg)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--t2)", fontFamily: "inherit",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download
          </button>

          {onDelete && (
            <button
              onClick={() => onDelete(current)}
              style={{
                height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid rgba(201,59,46,0.2)",
                background: "rgba(201,59,46,0.06)", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--red)", fontFamily: "inherit",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6"/>
                <path d="M14 11v6"/>
              </svg>
              Löschen
            </button>
          )}

          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)", flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ position: "relative", flex: 1, background: "#2a2a2a", overflow: "hidden" }}>
          {loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13 }}>
              <div className="animate-spin" style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", marginRight: 10 }} />
              Lade Vorschau…
            </div>
          )}
          {!loading && url && (
            <iframe
              key={current.id}
              src={url}
              title={current.file_name}
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            />
          )}
          {!loading && !url && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13 }}>
              Vorschau konnte nicht geladen werden.
            </div>
          )}

          {docs.length > 1 && (
            <>
              <button
                onClick={() => setIndex((index - 1 + docs.length) % docs.length)}
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
                aria-label="Vorheriges Dokument"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button
                onClick={() => setIndex((index + 1) % docs.length)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
                aria-label="Nächstes Dokument"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
