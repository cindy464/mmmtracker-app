/*
# Create app_state table for ChezaCheza MMM workspace

1. New Tables
- `app_state`: single-row state store for the entire MMM workspace
  - `id` (int, primary key, fixed at 1)
  - `state` (jsonb, holds the full workspace object: meetings, activeMeetingId, settings)
  - `updated_at` (timestamptz, auto-updated on write)

2. Security
- Enable RLS on `app_state`.
- Single-tenant app (no Supabase auth sign-in); the frontend uses the anon key.
- Allow anon + authenticated full CRUD because the data is intentionally shared/public across the workspace.

3. Notes
- The React app reads with `.eq('id', 1).maybeSingle()` and writes with `.upsert({ id: 1, state: {...} })`.
- The `state` column holds the same shape that was previously stored in localStorage, so existing local data migrates seamlessly.
*/

CREATE TABLE IF NOT EXISTS app_state (
  id integer PRIMARY KEY DEFAULT 1,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_app_state" ON app_state;
CREATE POLICY "anon_select_app_state"
ON app_state FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_app_state" ON app_state;
CREATE POLICY "anon_insert_app_state"
ON app_state FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_app_state" ON app_state;
CREATE POLICY "anon_update_app_state"
ON app_state FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_app_state" ON app_state;
CREATE POLICY "anon_delete_app_state"
ON app_state FOR DELETE
TO anon, authenticated USING (true);
