-- =============================================================
-- Aufgaben-Modul: erweiterte Tasks, Checklist, Comments,
-- Attachments + Storage-Bucket. Idempotent.
-- Nutzt bestehendes organizations/organization_members-Schema
-- (Ownership via organization_members.role='owner').
-- =============================================================

-- -------------------------------------------------------------
-- 1. HELPER: my_organization_ids()
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION my_organization_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
$$;

-- -------------------------------------------------------------
-- 2. TASKS: Status + Org + Assignment + Recurrence + Subtasks
-- -------------------------------------------------------------

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
      CHECK (status IN ('planned','in_progress','on_hold','done'));
  END IF;
END $$;

-- Backfill status from is_done falls noch vorhanden
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='tasks' AND column_name='is_done') THEN
    UPDATE tasks SET status = CASE WHEN is_done THEN 'done' ELSE 'planned' END
      WHERE status IS NULL;
    ALTER TABLE tasks DROP COLUMN is_done;
  END IF;
END $$;

UPDATE tasks SET status = 'planned' WHERE status IS NULL;
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'planned';
ALTER TABLE tasks ALTER COLUMN status SET NOT NULL;

DROP INDEX IF EXISTS tasks_is_done_idx;
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to     uuid REFERENCES auth.users(id)    ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id  uuid REFERENCES tasks(id)         ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence      text DEFAULT 'none';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_recurrence_check') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_recurrence_check
      CHECK (recurrence IN ('none','daily','weekly','monthly','yearly'));
  END IF;
END $$;
UPDATE tasks SET recurrence = 'none' WHERE recurrence IS NULL;
ALTER TABLE tasks ALTER COLUMN recurrence SET DEFAULT 'none';
ALTER TABLE tasks ALTER COLUMN recurrence SET NOT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end  date;

-- Backfill: organization_id via organization_members.role='owner'
UPDATE tasks t SET organization_id = (
  SELECT om.organization_id FROM organization_members om
  WHERE om.user_id = t.user_id AND om.role = 'owner'
  LIMIT 1
) WHERE organization_id IS NULL;

-- NOT NULL nur setzen, wenn Backfill vollständig
DO $$
DECLARE null_count int;
BEGIN
  SELECT count(*) INTO null_count FROM tasks WHERE organization_id IS NULL;
  IF null_count = 0 THEN
    BEGIN
      ALTER TABLE tasks ALTER COLUMN organization_id SET NOT NULL;
    EXCEPTION WHEN others THEN NULL;
    END;
  ELSE
    RAISE NOTICE 'tasks.organization_id: % rows still NULL — NOT NULL not set', null_count;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS tasks_org_idx          ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx  ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_parent_idx       ON tasks(parent_task_id);

-- Neue RLS für tasks: Org-basiert
DROP POLICY IF EXISTS "tasks_own"        ON tasks;
DROP POLICY IF EXISTS "tasks_org_select" ON tasks;
DROP POLICY IF EXISTS "tasks_org_write"  ON tasks;
CREATE POLICY "tasks_org_select" ON tasks FOR SELECT
  USING (organization_id IN (SELECT my_organization_ids()));
CREATE POLICY "tasks_org_write" ON tasks FOR ALL
  USING (organization_id IN (SELECT my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT my_organization_ids()));

-- -------------------------------------------------------------
-- 3. CHECKLIST-ITEMS
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_checklist_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label       text NOT NULL,
  is_done     boolean NOT NULL DEFAULT false,
  position    integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS task_checklist_items_task_idx ON task_checklist_items (task_id, position);
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_checklist_access" ON task_checklist_items;
CREATE POLICY "task_checklist_access" ON task_checklist_items FOR ALL
  USING (
    task_id IN (SELECT id FROM tasks WHERE organization_id IN (SELECT my_organization_ids()))
  )
  WITH CHECK (
    task_id IN (SELECT id FROM tasks WHERE organization_id IN (SELECT my_organization_ids()))
  );

-- -------------------------------------------------------------
-- 4. COMMENTS
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  task_id     uuid NOT NULL REFERENCES tasks(id)        ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  content     text NOT NULL
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'task_comments_updated_at') THEN
    CREATE TRIGGER task_comments_updated_at
      BEFORE UPDATE ON task_comments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS task_comments_task_idx ON task_comments (task_id, created_at);
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_comments_select" ON task_comments;
DROP POLICY IF EXISTS "task_comments_insert" ON task_comments;
DROP POLICY IF EXISTS "task_comments_update" ON task_comments;
DROP POLICY IF EXISTS "task_comments_delete" ON task_comments;
CREATE POLICY "task_comments_select" ON task_comments FOR SELECT
  USING (task_id IN (SELECT id FROM tasks WHERE organization_id IN (SELECT my_organization_ids())));
CREATE POLICY "task_comments_insert" ON task_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    task_id IN (SELECT id FROM tasks WHERE organization_id IN (SELECT my_organization_ids()))
  );
CREATE POLICY "task_comments_update" ON task_comments FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "task_comments_delete" ON task_comments FOR DELETE
  USING (user_id = auth.uid());

-- -------------------------------------------------------------
-- 5. ATTACHMENTS
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_attachments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  task_id       uuid NOT NULL REFERENCES tasks(id)       ON DELETE CASCADE,
  user_id       uuid          REFERENCES auth.users(id)  ON DELETE SET NULL,
  storage_path  text NOT NULL,
  file_name     text NOT NULL,
  mime_type     text,
  size_bytes    integer
);
CREATE INDEX IF NOT EXISTS task_attachments_task_idx ON task_attachments (task_id);
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_attachments_all" ON task_attachments;
CREATE POLICY "task_attachments_all" ON task_attachments FOR ALL
  USING (task_id IN (SELECT id FROM tasks WHERE organization_id IN (SELECT my_organization_ids())))
  WITH CHECK (task_id IN (SELECT id FROM tasks WHERE organization_id IN (SELECT my_organization_ids())));

-- -------------------------------------------------------------
-- 6. STORAGE-BUCKET
-- -------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "task_attachments_upload" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_read"   ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_delete" ON storage.objects;
CREATE POLICY "task_attachments_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "task_attachments_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "task_attachments_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);
