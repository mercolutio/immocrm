-- =============================================================
-- Pipeline Stages — benutzerdefinierte Deal-Phasen
-- =============================================================

-- 1. pipeline_stages Tabelle
CREATE TABLE pipeline_stages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  color      text        NOT NULL DEFAULT '#C2692A',
  position   integer     NOT NULL DEFAULT 0,
  is_default boolean     NOT NULL DEFAULT false
);

CREATE INDEX pipeline_stages_user_id_idx ON pipeline_stages(user_id);
CREATE INDEX pipeline_stages_position_idx ON pipeline_stages(user_id, position);

ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_stages_own" ON pipeline_stages
  FOR ALL USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 2. Trigger: Standard-Stages bei neuem User
CREATE OR REPLACE FUNCTION create_default_pipeline_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.pipeline_stages (user_id, name, color, position, is_default) VALUES
    (NEW.id, 'Qualifizierung', '#3B82F6', 0, true),
    (NEW.id, 'Besichtigung',   '#8B5CF6', 1, true),
    (NEW.id, 'Verhandlung',    '#F59E0B', 2, true),
    (NEW.id, 'Notariat',       '#C2692A', 3, true),
    (NEW.id, 'Abschluss',      '#10B981', 4, true),
    (NEW.id, 'Verloren',       '#6B7280', 5, true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_pipeline
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_pipeline_stages();

-- 3. Seed für bestehende User
INSERT INTO pipeline_stages (user_id, name, color, position, is_default)
SELECT u.id, s.name, s.color, s.position, true
FROM auth.users u
CROSS JOIN (VALUES
  ('Qualifizierung', '#3B82F6', 0),
  ('Besichtigung',   '#8B5CF6', 1),
  ('Verhandlung',    '#F59E0B', 2),
  ('Notariat',       '#C2692A', 3),
  ('Abschluss',      '#10B981', 4),
  ('Verloren',       '#6B7280', 5)
) AS s(name, color, position)
WHERE NOT EXISTS (
  SELECT 1 FROM pipeline_stages ps WHERE ps.user_id = u.id
);

-- 4. deals.stage ENUM → deals.stage_id FK
ALTER TABLE deals DROP COLUMN stage;
ALTER TABLE deals ADD COLUMN stage_id uuid REFERENCES pipeline_stages(id) ON DELETE SET NULL;
CREATE INDEX deals_stage_id_idx ON deals(stage_id);
DROP INDEX IF EXISTS deals_stage_idx;

-- 5. ENUM aufräumen
DROP TYPE IF EXISTS deal_stage;
