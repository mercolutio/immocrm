-- ═══════════════════════════════════════════════════════════════════════════
-- Security + Performance Fixes (Supabase Dashboard Warnungen)
-- ═══════════════════════════════════════════════════════════════════════════

-- SECURITY: anon-Rolle auf SELECT beschränken
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- SECURITY: authenticated braucht kein TRUNCATE/REFERENCES/TRIGGER
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;

-- SECURITY: search_path auf update_updated_at fixieren (Function Search Path Mutable)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- PERFORMANCE: Fehlender Index auf property_images.user_id (FK)
CREATE INDEX IF NOT EXISTS property_images_user_id_idx
  ON property_images (user_id);

-- PERFORMANCE: Fehlende Indizes auf auth-Schema FKs
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_factor_id
  ON auth.mfa_challenges (factor_id);

CREATE INDEX IF NOT EXISTS idx_saml_relay_states_flow_state_id
  ON auth.saml_relay_states (flow_state_id);

CREATE INDEX IF NOT EXISTS idx_oauth_authorizations_client_id
  ON auth.oauth_authorizations (client_id);

CREATE INDEX IF NOT EXISTS idx_oauth_authorizations_user_id
  ON auth.oauth_authorizations (user_id);

-- PERFORMANCE: RLS-Policies von uid() auf (SELECT auth.uid()) ändern
-- Subquery wird einmal evaluiert statt pro Zeile (Auth RLS Initialization Plan)

DROP POLICY IF EXISTS contacts_own ON contacts;
CREATE POLICY contacts_own ON contacts FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS properties_own ON properties;
CREATE POLICY properties_own ON properties FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS activities_own ON activities;
CREATE POLICY activities_own ON activities FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notes_own ON notes;
CREATE POLICY notes_own ON notes FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS tasks_own ON tasks;
CREATE POLICY tasks_own ON tasks FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS deals_own ON deals;
CREATE POLICY deals_own ON deals FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS property_images_own ON property_images;
CREATE POLICY property_images_own ON property_images FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS search_profiles_own ON search_profiles;
CREATE POLICY search_profiles_own ON search_profiles FOR ALL
  USING (EXISTS (
    SELECT 1 FROM contacts
    WHERE contacts.id = search_profiles.contact_id
      AND contacts.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM contacts
    WHERE contacts.id = search_profiles.contact_id
      AND contacts.user_id = (SELECT auth.uid())
  ));
