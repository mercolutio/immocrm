-- =============================================================
-- Aufgaben-Architektur Phase 1: Templates, Abhängigkeiten,
-- Erinnerungen, Positionen + Notification-System. Idempotent.
-- =============================================================

-- -------------------------------------------------------------
-- 1. TASKS: neue Spalten
-- -------------------------------------------------------------

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS depends_on_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS template_id        uuid; -- FK wird nach Template-Tabelle gesetzt
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at        timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position           integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS tasks_depends_idx    ON tasks(depends_on_task_id);
CREATE INDEX IF NOT EXISTS tasks_template_idx   ON tasks(template_id);
CREATE INDEX IF NOT EXISTS tasks_reminder_idx   ON tasks(reminder_at) WHERE reminder_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_position_idx   ON tasks(organization_id, position);

-- -------------------------------------------------------------
-- 2. TASK TEMPLATES
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  name            text NOT NULL,
  description     text
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'task_templates_updated_at') THEN
    CREATE TRIGGER task_templates_updated_at
      BEFORE UPDATE ON task_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS task_templates_org_idx ON task_templates(organization_id);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_templates_org_select" ON task_templates;
DROP POLICY IF EXISTS "task_templates_org_write"  ON task_templates;
CREATE POLICY "task_templates_org_select" ON task_templates FOR SELECT
  USING (organization_id IN (SELECT my_organization_ids()));
CREATE POLICY "task_templates_org_write" ON task_templates FOR ALL
  USING (organization_id IN (SELECT my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT my_organization_ids()));

-- FK auf tasks.template_id jetzt setzen
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_template_id_fkey' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- -------------------------------------------------------------
-- 3. TASK TEMPLATE ITEMS
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS task_template_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  template_id         uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  title               text NOT NULL,
  description         text,
  priority            text NOT NULL DEFAULT 'medium',
  due_offset_days     integer NOT NULL DEFAULT 0,
  position            integer NOT NULL DEFAULT 0,
  depends_on_item_id  uuid REFERENCES task_template_items(id) ON DELETE SET NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_template_items_priority_check') THEN
    ALTER TABLE task_template_items ADD CONSTRAINT task_template_items_priority_check
      CHECK (priority IN ('low','medium','high'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS task_template_items_template_idx
  ON task_template_items(template_id, position);

ALTER TABLE task_template_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_template_items_access" ON task_template_items;
CREATE POLICY "task_template_items_access" ON task_template_items FOR ALL
  USING (
    template_id IN (SELECT id FROM task_templates WHERE organization_id IN (SELECT my_organization_ids()))
  )
  WITH CHECK (
    template_id IN (SELECT id FROM task_templates WHERE organization_id IN (SELECT my_organization_ids()))
  );

-- -------------------------------------------------------------
-- 4. NOTIFICATIONS
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id     uuid REFERENCES tasks(id) ON DELETE CASCADE,
  type        text NOT NULL,
  title       text NOT NULL,
  body        text,
  read_at     timestamptz
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
      CHECK (type IN ('reminder','due_today','overdue','dependency_resolved'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS notifications_user_idx     ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx   ON notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_own_select" ON notifications;
DROP POLICY IF EXISTS "notifications_own_write"  ON notifications;
CREATE POLICY "notifications_own_select" ON notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "notifications_own_write" ON notifications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
