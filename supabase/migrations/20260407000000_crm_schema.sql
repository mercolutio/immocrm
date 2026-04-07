-- =============================================================
-- ImmoCRM — Kern-Schema Migration
-- Voraussetzung: auth.users (Supabase Auth), organizations, organization_members
-- =============================================================

-- -------------------------------------------------------------
-- 1. ENUM-Typen
-- -------------------------------------------------------------

CREATE TYPE contact_type AS ENUM ('buyer', 'seller', 'both', 'tenant', 'landlord');
CREATE TYPE contact_source AS ENUM ('website', 'referral', 'portal', 'cold', 'other');
CREATE TYPE property_type AS ENUM ('apartment', 'house', 'land', 'commercial');
CREATE TYPE property_status AS ENUM ('available', 'reserved', 'sold', 'rented');
CREATE TYPE deal_stage AS ENUM ('lead', 'contact_made', 'viewing', 'offer', 'notary', 'closed', 'lost');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE activity_type AS ENUM ('call', 'email', 'viewing', 'meeting', 'note');
CREATE TYPE search_type AS ENUM ('buy', 'rent');

-- -------------------------------------------------------------
-- 2. Trigger-Funktion: updated_at automatisch setzen
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------
-- 3. contacts
-- -------------------------------------------------------------

CREATE TABLE contacts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              contact_type NOT NULL,
  first_name        text        NOT NULL,
  last_name         text        NOT NULL,
  email             text,
  phone             text,
  source            contact_source NOT NULL DEFAULT 'other',
  notes             text,
  is_archived       boolean     NOT NULL DEFAULT false
);

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_own" ON contacts
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX contacts_user_id_idx       ON contacts(user_id);
CREATE INDEX contacts_type_idx          ON contacts(type);
CREATE INDEX contacts_is_archived_idx   ON contacts(is_archived);
CREATE INDEX contacts_email_idx         ON contacts(email);

-- -------------------------------------------------------------
-- 4. properties
-- -------------------------------------------------------------

CREATE TABLE properties (
  id                uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz    NOT NULL DEFAULT now(),
  updated_at        timestamptz    NOT NULL DEFAULT now(),
  user_id           uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              property_type  NOT NULL,
  title             text           NOT NULL,
  description       text,
  street            text,
  house_number      text,
  zip               text,
  city              text,
  price             numeric(12, 2),
  rent              numeric(10, 2),
  area_sqm          numeric(8, 2),
  rooms             numeric(4, 1),
  status            property_status NOT NULL DEFAULT 'available',
  owner_contact_id  uuid           REFERENCES contacts(id) ON DELETE SET NULL,
  is_archived       boolean        NOT NULL DEFAULT false
);

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties_own" ON properties
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX properties_user_id_idx         ON properties(user_id);
CREATE INDEX properties_owner_contact_idx   ON properties(owner_contact_id);
CREATE INDEX properties_status_idx          ON properties(status);
CREATE INDEX properties_type_idx            ON properties(type);
CREATE INDEX properties_is_archived_idx     ON properties(is_archived);
CREATE INDEX properties_city_idx            ON properties(city);

-- -------------------------------------------------------------
-- 5. search_profiles
-- -------------------------------------------------------------

CREATE TABLE search_profiles (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  contact_id        uuid        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  type              search_type NOT NULL,
  property_type     property_type NOT NULL,
  min_area          numeric(8, 2),
  max_area          numeric(8, 2),
  min_rooms         numeric(4, 1),
  max_rooms         numeric(4, 1),
  max_price         numeric(12, 2),
  cities            text[],
  notes             text
);

CREATE TRIGGER search_profiles_updated_at
  BEFORE UPDATE ON search_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE search_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_profiles_own" ON search_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = search_profiles.contact_id
        AND contacts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = search_profiles.contact_id
        AND contacts.user_id = auth.uid()
    )
  );

CREATE INDEX search_profiles_contact_id_idx ON search_profiles(contact_id);
CREATE INDEX search_profiles_type_idx       ON search_profiles(type);

-- -------------------------------------------------------------
-- 6. deals
-- -------------------------------------------------------------

CREATE TABLE deals (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id          uuid        REFERENCES contacts(id) ON DELETE SET NULL,
  property_id         uuid        REFERENCES properties(id) ON DELETE SET NULL,
  stage               deal_stage  NOT NULL DEFAULT 'lead',
  probability         integer     CHECK (probability >= 0 AND probability <= 100),
  commission          numeric(12, 2),
  expected_close_date date,
  notes               text
);

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deals_own" ON deals
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX deals_user_id_idx      ON deals(user_id);
CREATE INDEX deals_contact_id_idx   ON deals(contact_id);
CREATE INDEX deals_property_id_idx  ON deals(property_id);
CREATE INDEX deals_stage_idx        ON deals(stage);

-- -------------------------------------------------------------
-- 7. tasks
-- -------------------------------------------------------------

CREATE TABLE tasks (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  user_id       uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id    uuid          REFERENCES contacts(id) ON DELETE SET NULL,
  property_id   uuid          REFERENCES properties(id) ON DELETE SET NULL,
  deal_id       uuid          REFERENCES deals(id) ON DELETE SET NULL,
  title         text          NOT NULL,
  description   text,
  due_date      timestamptz,
  is_done       boolean       NOT NULL DEFAULT false,
  priority      task_priority NOT NULL DEFAULT 'medium'
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_own" ON tasks
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX tasks_user_id_idx      ON tasks(user_id);
CREATE INDEX tasks_contact_id_idx   ON tasks(contact_id);
CREATE INDEX tasks_property_id_idx  ON tasks(property_id);
CREATE INDEX tasks_deal_id_idx      ON tasks(deal_id);
CREATE INDEX tasks_due_date_idx     ON tasks(due_date);
CREATE INDEX tasks_is_done_idx      ON tasks(is_done);
CREATE INDEX tasks_priority_idx     ON tasks(priority);

-- -------------------------------------------------------------
-- 8. activities
-- -------------------------------------------------------------

CREATE TABLE activities (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  user_id       uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id    uuid          REFERENCES contacts(id) ON DELETE SET NULL,
  property_id   uuid          REFERENCES properties(id) ON DELETE SET NULL,
  deal_id       uuid          REFERENCES deals(id) ON DELETE SET NULL,
  type          activity_type NOT NULL,
  summary       text          NOT NULL,
  happened_at   timestamptz   NOT NULL DEFAULT now(),
  notes         text
);

CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_own" ON activities
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX activities_user_id_idx     ON activities(user_id);
CREATE INDEX activities_contact_id_idx  ON activities(contact_id);
CREATE INDEX activities_property_id_idx ON activities(property_id);
CREATE INDEX activities_deal_id_idx     ON activities(deal_id);
CREATE INDEX activities_happened_at_idx ON activities(happened_at);
CREATE INDEX activities_type_idx        ON activities(type);

-- -------------------------------------------------------------
-- 9. notes
-- -------------------------------------------------------------

CREATE TABLE notes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id    uuid        REFERENCES contacts(id) ON DELETE CASCADE,
  property_id   uuid        REFERENCES properties(id) ON DELETE CASCADE,
  deal_id       uuid        REFERENCES deals(id) ON DELETE CASCADE,
  body          text        NOT NULL
);

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_own" ON notes
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX notes_user_id_idx      ON notes(user_id);
CREATE INDEX notes_contact_id_idx   ON notes(contact_id);
CREATE INDEX notes_property_id_idx  ON notes(property_id);
CREATE INDEX notes_deal_id_idx      ON notes(deal_id);
