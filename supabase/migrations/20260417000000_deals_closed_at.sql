-- =============================================================
-- Deals: closed_at + pipeline_stages.is_won / is_lost
-- Fundament für Dashboard-KPIs (Provision MTD, Ø Abschlusszeit,
-- Aktive Deals) auf echten Daten.
-- =============================================================

-- 1. is_won / is_lost Flags auf pipeline_stages
ALTER TABLE pipeline_stages ADD COLUMN is_won  boolean NOT NULL DEFAULT false;
ALTER TABLE pipeline_stages ADD COLUMN is_lost boolean NOT NULL DEFAULT false;

-- 2. Bestehende Default-Stages markieren
UPDATE pipeline_stages SET is_won  = true WHERE name = 'Abschluss';
UPDATE pipeline_stages SET is_lost = true WHERE name = 'Verloren';

-- 3. Default-Stages-Trigger aktualisieren
CREATE OR REPLACE FUNCTION create_default_pipeline_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.pipeline_stages (user_id, name, color, position, is_default, is_won, is_lost) VALUES
    (NEW.id, 'Qualifizierung', '#3B82F6', 0, true, false, false),
    (NEW.id, 'Besichtigung',   '#8B5CF6', 1, true, false, false),
    (NEW.id, 'Verhandlung',    '#F59E0B', 2, true, false, false),
    (NEW.id, 'Notariat',       '#C2692A', 3, true, false, false),
    (NEW.id, 'Abschluss',      '#10B981', 4, true, true,  false),
    (NEW.id, 'Verloren',       '#6B7280', 5, true, false, true);
  RETURN NEW;
END;
$$;

-- 4. deals.closed_at
ALTER TABLE deals ADD COLUMN closed_at timestamptz;

-- 5. Backfill: bestehende Deals in terminaler Stage bekommen closed_at = updated_at
UPDATE deals d
SET closed_at = d.updated_at
FROM pipeline_stages ps
WHERE d.stage_id = ps.id AND (ps.is_won OR ps.is_lost);

-- 6. Trigger: closed_at automatisch pflegen bei Stage-Wechsel
CREATE OR REPLACE FUNCTION update_deal_closed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_is_terminal boolean := false;
BEGIN
  IF NEW.stage_id IS NOT NULL THEN
    SELECT (is_won OR is_lost) INTO new_is_terminal FROM public.pipeline_stages WHERE id = NEW.stage_id;
  END IF;

  IF new_is_terminal THEN
    IF NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    END IF;
  ELSE
    NEW.closed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_deals_closed_at ON deals;
CREATE TRIGGER set_deals_closed_at
BEFORE INSERT OR UPDATE OF stage_id ON deals
FOR EACH ROW EXECUTE FUNCTION update_deal_closed_at();

-- 7. Index für MTD-Queries
CREATE INDEX IF NOT EXISTS deals_closed_at_idx ON deals(closed_at) WHERE closed_at IS NOT NULL;
