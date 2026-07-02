-- Make the course-outline and seating-chart file buckets private.
--
-- Previously these buckets were public, so anyone who ever saw an
-- /object/public/... URL could open the file forever. We now serve them only
-- via short-lived signed URLs minted server-side for logged-in users (see
-- app/api/files/route.ts). Flipping the buckets private kills the old public
-- URLs; the RLS policy below lets an authenticated user's session generate
-- signed URLs (createSignedUrl needs SELECT on the object).

update storage.buckets set public = false
  where id in ('course-outlines', 'seating-charts');

-- Let logged-in cohort members mint signed URLs for these two buckets.
-- createSignedUrl runs with the user's session (anon key + auth cookie), so it
-- needs SELECT on these objects via RLS. Anonymous visitors get nothing.
drop policy if exists "outlines_seating_read_auth" on storage.objects;
create policy "outlines_seating_read_auth" on storage.objects
  for select to authenticated
  using (bucket_id in ('course-outlines', 'seating-charts'));
