-- =============================================================
-- documents — Dokumenten-/Anhang-Verwaltung pro Entity
-- =============================================================

CREATE TABLE documents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type   text        NOT NULL CHECK (entity_type IN ('contact', 'property', 'deal')),
  entity_id     uuid        NOT NULL,
  storage_path  text        NOT NULL,
  file_name     text        NOT NULL,
  mime_type     text,
  size_bytes    bigint
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_own" ON documents
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX documents_entity_idx ON documents(entity_type, entity_id);
CREATE INDEX documents_user_idx   ON documents(user_id);

-- Privater Bucket (nicht public — Download nur via Signed URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage-Policies: Path-Format {user_id}/{entity_type}/{entity_id}/{file}
-- Nur der eigene User (erster Path-Segment) darf lesen/schreiben/löschen.
CREATE POLICY "documents_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "documents_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "documents_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
