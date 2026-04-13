-- Add energy data and additional detail columns to properties
ALTER TABLE properties
  ADD COLUMN energy_certificate_type text,
  ADD COLUMN energy_efficiency_class text,
  ADD COLUMN energy_consumption numeric,
  ADD COLUMN heating_type text,
  ADD COLUMN construction_year integer,
  ADD COLUMN primary_energy_source text,
  ADD COLUMN floor_number integer,
  ADD COLUMN total_floors integer,
  ADD COLUMN parking text,
  ADD COLUMN basement boolean,
  ADD COLUMN elevator boolean,
  ADD COLUMN outdoor_space text,
  ADD COLUMN plot_area numeric;
