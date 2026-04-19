-- =============================================================
-- Pipeline: 5 → 6 Phasen
-- =============================================================
-- Alt: Qualifizierung, Besichtigung, Verhandlung, Notariat, Abschluss, Verloren
-- Neu: Lead, Qualifizierung, Besichtigung, Verhandlung, Abschluss, Gewonnen, Verloren
--
-- Änderungen:
--  - "Lead" als Vor-Qualifizierung (pos 0)
--  - "Notariat" entfernt (wird Teilschritt innerhalb Abschluss)
--  - "Gewonnen" neu als finale Won-Stufe nach Abschluss (pos 5, is_won=true)
--  - "Abschluss" verliert is_won-Status (wird Vor-Gewonnen-Schritt)
--  - "Verloren" rückt auf pos 6
--
-- Idempotent: Wiederholtes Ausführen ist sicher.
-- =============================================================

-- 1. Notariat-Deals (falls vorhanden) auf Abschluss-Stage des selben Users migrieren
UPDATE deals d
SET stage_id = target.id
FROM pipeline_stages notariat
JOIN pipeline_stages target
  ON target.user_id = notariat.user_id AND target.name = 'Abschluss'
WHERE d.stage_id = notariat.id
  AND notariat.name = 'Notariat';

-- 2. Notariat-Stages löschen (pro User)
DELETE FROM pipeline_stages WHERE name = 'Notariat';

-- 3. Abschluss: is_won zurücksetzen (ist jetzt Vor-Gewonnen)
UPDATE pipeline_stages SET is_won = false WHERE name = 'Abschluss';

-- 4. Lead einfügen (Platzhalter-Position, wird in Schritt 6 korrigiert)
INSERT INTO pipeline_stages (user_id, name, color, position, is_default, is_won, is_lost)
SELECT DISTINCT ps.user_id, 'Lead', '#78756E', -1, true, false, false
FROM pipeline_stages ps
WHERE NOT EXISTS (
  SELECT 1 FROM pipeline_stages ps2
  WHERE ps2.user_id = ps.user_id AND ps2.name = 'Lead'
);

-- 5. Gewonnen einfügen (Platzhalter-Position, wird in Schritt 6 korrigiert)
INSERT INTO pipeline_stages (user_id, name, color, position, is_default, is_won, is_lost)
SELECT DISTINCT ps.user_id, 'Gewonnen', '#10B981', 99, true, true, false
FROM pipeline_stages ps
WHERE NOT EXISTS (
  SELECT 1 FROM pipeline_stages ps2
  WHERE ps2.user_id = ps.user_id AND ps2.name = 'Gewonnen'
);

-- 6. Positionen pro User neu setzen (nach Name)
UPDATE pipeline_stages SET position = 0 WHERE name = 'Lead';
UPDATE pipeline_stages SET position = 1 WHERE name = 'Qualifizierung';
UPDATE pipeline_stages SET position = 2 WHERE name = 'Besichtigung';
UPDATE pipeline_stages SET position = 3 WHERE name = 'Verhandlung';
UPDATE pipeline_stages SET position = 4 WHERE name = 'Abschluss';
UPDATE pipeline_stages SET position = 5 WHERE name = 'Gewonnen';
UPDATE pipeline_stages SET position = 6 WHERE name = 'Verloren';

-- 7. Default-Stages-Trigger aktualisieren (neue User bekommen 7 Stages)
CREATE OR REPLACE FUNCTION create_default_pipeline_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.pipeline_stages (user_id, name, color, position, is_default, is_won, is_lost) VALUES
    (NEW.id, 'Lead',           '#78756E', 0, true, false, false),
    (NEW.id, 'Qualifizierung', '#3B82F6', 1, true, false, false),
    (NEW.id, 'Besichtigung',   '#8B5CF6', 2, true, false, false),
    (NEW.id, 'Verhandlung',    '#F59E0B', 3, true, false, false),
    (NEW.id, 'Abschluss',      '#C2692A', 4, true, false, false),
    (NEW.id, 'Gewonnen',       '#10B981', 5, true, true,  false),
    (NEW.id, 'Verloren',       '#6B7280', 6, true, false, true);
  RETURN NEW;
END;
$$;
