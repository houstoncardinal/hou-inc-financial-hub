-- ============================================================================
-- HOU INC · HGP Command Map (job coordinates)
--
-- Adds latitude/longitude to hgp_jobs so install/service/emergency jobs can
-- plot on the Storm Response dispatch map alongside customer sites (which
-- already carry coordinates) and outage events. Coordinates are set from the
-- app via the Mapbox Geocoding API (the same authorized pattern the admin
-- Client Map uses with VITE_MAPBOX_TOKEN) or entered manually from the
-- "Needs Coordinates" queue — no provider scraping involved.
--
-- Safe to re-run. Run in the Supabase SQL editor after 20260717000006.
-- ============================================================================

ALTER TABLE public.hgp_jobs
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

CREATE INDEX IF NOT EXISTS idx_hgp_jobs_coords
  ON public.hgp_jobs(latitude, longitude)
  WHERE deleted_at IS NULL AND latitude IS NOT NULL;

CREATE OR REPLACE FUNCTION public.verify_hgp_command_map()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('hgp_job_coordinates',
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hgp_jobs' AND column_name='latitude'),
      'latitude/longitude on generator jobs for the dispatch map');
END;
$$;

NOTIFY pgrst, 'reload schema';
