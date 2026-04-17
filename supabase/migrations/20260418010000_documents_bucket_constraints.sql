-- Härtet den documents-Bucket: Storage-Service lehnt Uploads ab,
-- deren Content-Type nicht in der Whitelist ist oder die 25 MB überschreiten.
-- Defense-in-depth neben dem Route-Handler-Magic-Byte-Check.
UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/webp'
  ],
  file_size_limit = 26214400
WHERE id = 'documents';
