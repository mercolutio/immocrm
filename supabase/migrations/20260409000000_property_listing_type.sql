-- =============================================================
-- Properties: listing_type (buy/rent) hinzufügen
-- =============================================================
-- Unterscheidet Kauf- von Mietobjekten eindeutig, statt aus
-- (price IS NOT NULL) / (rent IS NOT NULL) abzuleiten.
-- Nutzt den existierenden search_type Enum.

ALTER TABLE properties
  ADD COLUMN listing_type search_type NOT NULL DEFAULT 'buy';

CREATE INDEX properties_listing_type_idx ON properties(listing_type);
