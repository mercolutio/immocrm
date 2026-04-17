"use client";

import { useRef } from "react";
import { useDocuments } from "./useDocuments";
import { formatFileSize, getDocumentIconKey } from "@/lib/document-utils";
import type { Document, DocumentEntityType } from "@/lib/types";

function FileIcon({ kind, size = 18 }: { kind: ReturnType<typeof getDocumentIconKey>; size?: number }) {
  const s = { width: size, height: size };
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "pdf":
      return (
        <svg {...s} viewBox="0 0 24 24" {...stroke}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <text x="12" y="17" textAnchor="middle" fontSize="5.5" fontWeight="700" stroke="none" fill="currentColor">PDF</text>
        </svg>
      );
    case "word":
      return (
        <svg {...s} viewBox="0 0 24 24" {...stroke}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <text x="12" y="17" textAnchor="middle" fontSize="5" fontWeight="700" stroke="none" fill="currentColor">DOC</text>
        </svg>
      );
    case "excel":
      return (
        <svg {...s} viewBox="0 0 24 24" {...stroke}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <text x="12" y="17" textAnchor="middle" fontSize="5" fontWeight="700" stroke="none" fill="currentColor">XLS</text>
        </svg>
      );
    case "image":
      return (
        <svg {...s} viewBox="0 0 24 24" {...stroke}>
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
      );
    default:
      return (
        <svg {...s} viewBox="0 0 24 24" {...stroke}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      );
  }
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function DocumentsSection({
  entityType,
  entityId,
}: {
  entityType: DocumentEntityType;
  entityId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { docs, loading, uploading, dragOver, setDragOver, error, uploadFiles, downloadDoc, deleteDoc } = useDocuments(entityType, entityId);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      style={{
        background: "var(--card)",
        border: `1px solid ${dragOver ? "var(--accent)" : "rgba(0,0,0,0.05)"}`,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(28,24,20,0.055), 0 1px 2px rgba(28,24,20,0.04)",
        transition: `border-color var(--dur-out) var(--ease-out)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)", flexShrink: 0 }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", flex: 1 }}>Dokumente</span>
        {docs.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(194,105,42,0.1)", color: "var(--accent)", padding: "1px 7px", borderRadius: 8 }}>
            {docs.length}
          </span>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-icon-btn"
          style={{ width: 24, height: 24 }}
          title="Dokument hochladen"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {error && (
        <div style={{ padding: "8px 14px", fontSize: 12, color: "var(--red)", background: "var(--red-bg)", borderBottom: "1px solid var(--border)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: "var(--t3)" }}>Lade…</div>
      ) : docs.length === 0 && !uploading ? (
        <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: "var(--t3)" }}>
          Noch keine Dokumente. Dateien hierhin ziehen oder Plus klicken.
        </div>
      ) : (
        <div>
          {uploading && (
            <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--t3)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <div className="animate-spin" style={{ width: 12, height: 12, border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
              Lade hoch…
            </div>
          )}
          {docs.map((doc) => (
            <DocRow key={doc.id} doc={doc} onDownload={() => downloadDoc(doc)} onDelete={() => deleteDoc(doc)} />
          ))}
        </div>
      )}
    </div>
  );
}

function DocRow({ doc, onDownload, onDelete }: { doc: Document; onDownload: () => void; onDelete: () => void }) {
  const iconKind = getDocumentIconKey(doc.mime_type);
  return (
    <div
      className="h-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderBottom: "1px solid var(--border)",
      }}
      onClick={onDownload}
    >
      <div style={{ width: 30, height: 30, borderRadius: 6, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)", flexShrink: 0 }}>
        <FileIcon kind={iconKind} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--t1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {doc.file_name}
        </div>
        <div style={{ fontSize: 11, color: "var(--t3)", display: "flex", gap: 6 }}>
          <span>{formatFileSize(doc.size_bytes)}</span>
          <span>·</span>
          <span>{fmtDate(doc.created_at)}</span>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="h-icon-btn"
        style={{ width: 26, height: 26, color: "var(--t3)" }}
        title="Löschen"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6"/>
          <path d="M14 11v6"/>
        </svg>
      </button>
    </div>
  );
}
