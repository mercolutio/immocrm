import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fileTypeFromBuffer } from "file-type";
import {
  ALLOWED_DOCUMENT_MIME,
  ALLOWED_DOCUMENT_EXT,
  MAX_DOCUMENT_SIZE,
} from "@/lib/document-utils";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "documents";
const ENTITY_TYPES = ["contact", "property", "deal"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const entityType = form.get("entityType");
  const entityId = form.get("entityId");
  const file = form.get("file");

  if (typeof entityType !== "string" || !ENTITY_TYPES.includes(entityType as typeof ENTITY_TYPES[number])) {
    return NextResponse.json({ error: "Ungültiger entityType." }, { status: 400 });
  }
  if (typeof entityId !== "string" || !UUID_RE.test(entityId)) {
    return NextResponse.json({ error: "Ungültige entityId." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei fehlt." }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: "Datei ist leer." }, { status: 400 });
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    return NextResponse.json({ error: "Datei ist größer als 25 MB." }, { status: 400 });
  }

  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !ALLOWED_DOCUMENT_EXT.includes(ext)) {
    return NextResponse.json({ error: "Dateiendung wird nicht unterstützt." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(buf);
  const detectedMime = detected?.mime ?? "";
  if (!ALLOWED_DOCUMENT_MIME.includes(detectedMime)) {
    return NextResponse.json(
      { error: `Datei-Signatur passt nicht (${detectedMime || "unbekannt"}).` },
      { status: 400 },
    );
  }

  if (file.type && file.type !== detectedMime) {
    return NextResponse.json(
      { error: "Datei-Typ stimmt nicht mit Inhalt überein." },
      { status: 400 },
    );
  }

  const uuid = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${user.id}/${entityType}/${entityId}/${uuid}_${safeName}`;

  const upRes = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: detectedMime,
  });
  if (upRes.error) {
    return NextResponse.json({ error: upRes.error.message }, { status: 500 });
  }

  const { data, error: dbErr } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
      storage_path: path,
      file_name: file.name,
      mime_type: detectedMime,
      size_bytes: file.size,
    })
    .select()
    .single();

  if (dbErr) {
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ document: data });
}
