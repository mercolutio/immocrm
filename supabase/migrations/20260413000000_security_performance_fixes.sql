-- ═══════════════════════════════════════════════════════════════════════════
-- Security + Performance Fixes (Supabase Dashboard Warnungen)
-- ═══════════════════════════════════════════════════════════════════════════

-- SECURITY: anon-Rolle auf SELECT beschränken (RLS schützt zusätzlich,
-- aber anon sollte nie INSERT/UPDATE/DELETE/TRUNCATE können)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- SECURITY: authenticated braucht kein TRUNCATE/REFERENCES/TRIGGER
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;

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
