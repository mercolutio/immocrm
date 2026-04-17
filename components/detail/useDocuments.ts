import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateDocumentFile } from "@/lib/document-utils";
import type { Document, DocumentEntityType } from "@/lib/types";

const BUCKET = "documents";
const SIGNED_URL_TTL = 60;

export function useDocuments(entityType: DocumentEntityType, entityId: string) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) setError(error.message);
      else setDocs((data ?? []) as Document[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Nicht eingeloggt."); setUploading(false); return; }

    const newDocs: Document[] = [];
    for (const file of list) {
      const validationError = validateDocumentFile(file);
      if (validationError) { setError(validationError); continue; }

      const uuid = crypto.randomUUID();
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${entityType}/${entityId}/${uuid}_${safeName}`;

      const upRes = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
      });
      if (upRes.error) { setError(upRes.error.message); continue; }

      const { data, error: dbErr } = await supabase.from("documents").insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
      }).select().single();

      if (dbErr) {
        await supabase.storage.from(BUCKET).remove([path]);
        setError(dbErr.message);
        continue;
      }
      if (data) newDocs.push(data as Document);
    }

    if (newDocs.length > 0) setDocs((prev) => [...newDocs, ...prev]);
    setUploading(false);
  }

  async function downloadDoc(doc: Document) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, SIGNED_URL_TTL, { download: doc.file_name });
    if (error || !data?.signedUrl) {
      setError(error?.message ?? "Download fehlgeschlagen.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function deleteDoc(doc: Document) {
    if (!confirm(`Dokument "${doc.file_name}" wirklich löschen?`)) return;
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
  }

  return { docs, loading, uploading, dragOver, setDragOver, error, uploadFiles, downloadDoc, deleteDoc };
}
