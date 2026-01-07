ALTER TABLE IF EXISTS "kpi_preset_items"
  ADD COLUMN IF NOT EXISTS "scale_min" numeric(14, 2),
  ADD COLUMN IF NOT EXISTS "scale_max" numeric(14, 2),
  ADD COLUMN IF NOT EXISTS "scale_invert" boolean NOT NULL DEFAULT false;
