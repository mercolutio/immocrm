export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_DOCUMENT_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
];

export function validateDocumentFile(f: File): string | null {
  if (f.size > MAX_DOCUMENT_SIZE) return "Datei ist größer als 25 MB.";
  if (!ALLOWED_DOCUMENT_MIME.includes(f.type)) return "Dateityp wird nicht unterstützt.";
  return null;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type DocumentIconKey = "pdf" | "word" | "excel" | "image" | "file";

export function getDocumentIconKey(mime: string | null | undefined): DocumentIconKey {
  if (!mime) return "file";
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("word")) return "word";
  if (mime.includes("excel") || mime.includes("spreadsheet")) return "excel";
  if (mime.startsWith("image/")) return "image";
  return "file";
}
