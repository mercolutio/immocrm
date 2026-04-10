-- =============================================================
-- property_images — Bildverwaltung für Objekte
-- =============================================================

CREATE TABLE property_images (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  property_id     uuid        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path    text        NOT NULL,
  file_name       text        NOT NULL,
  position        integer     NOT NULL DEFAULT 0,
  is_cover        boolean     NOT NULL DEFAULT false,
  thumb_path      text
);

ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "property_images_own" ON property_images
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX property_images_property_id_idx ON property_images(property_id);
CREATE INDEX property_images_position_idx    ON property_images(property_id, position);

-- Storage Bucket (Supabase Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies: Nutzer darf eigene Dateien hochladen und lesen
CREATE POLICY "property_images_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'property-images'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "property_images_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'property-images'
  );

CREATE POLICY "property_images_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'property-images'
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    bucket_id = 'property-images'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "property_images_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'property-images'
    AND auth.uid() IS NOT NULL
  );
