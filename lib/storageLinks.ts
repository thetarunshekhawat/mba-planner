// Course outlines and seating charts live in PRIVATE Supabase Storage buckets.
// data/courses.ts still stores the old-style public-object URLs, but those no
// longer resolve. fileHref rewrites such a URL into a pointer at our auth-gated
// signing route (app/api/files/route.ts), which mints a short-lived signed URL
// for the logged-in user and redirects to it.

const PUBLIC_MARKER = '/storage/v1/object/public/';

/** Rewrite a stored Supabase public-object URL into our /api/files signing route. */
export function fileHref(publicUrl: string): string {
  const i = publicUrl.indexOf(PUBLIC_MARKER);
  if (i === -1) return publicUrl; // external / unknown URL — leave as-is
  const rest = publicUrl.slice(i + PUBLIC_MARKER.length); // "<bucket>/<key...>"
  const slash = rest.indexOf('/');
  if (slash === -1) return publicUrl;
  const bucket = rest.slice(0, slash);
  const key = rest.slice(slash + 1);
  return `/api/files?b=${encodeURIComponent(bucket)}&k=${encodeURIComponent(key)}`;
}
