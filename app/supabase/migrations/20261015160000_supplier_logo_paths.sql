-- =====================================================================================
-- Supplier logos (T5.1): point the 11 real suppliers at the normalized logo pack that is
-- shipped with the app (app/public/logos/<slug>.svg, built from logopack/color/).
-- Idempotent and non-destructive: only fills logo_path when it is still empty, so a logo
-- uploaded from the admin area (Supabase Storage path) is never overwritten.
-- Placeholder suppliers (tutela, altro-fornitore, non-lo-so) keep logo_path = null.
-- =====================================================================================

update public.suppliers s
   set logo_path = '/logos/' || v.slug || '.svg'
  from (values
  ('enel-energia'),
  ('eni-plenitude'),
  ('edison-energia'),
  ('a2a-energia'),
  ('hera-comm'),
  ('iren'),
  ('acea-energia'),
  ('sorgenia'),
  ('engie'),
  ('eon-energia'),
  ('iberdrola')
  ) as v(slug)
 where s.slug = v.slug
   and s.logo_path is null
   and not s.is_placeholder;
