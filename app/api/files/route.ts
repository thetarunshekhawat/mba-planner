// Auth-gated signing route for private Supabase Storage files (course outlines
// and section seating charts).
//
// GET /api/files?b=<bucket>&k=<object-key>
//
// Flow: auth gate (must be a logged-in cohort member) → validate the bucket is
// one of the two allowlisted private buckets and the key is not a traversal →
// mint a signed URL that expires in 10 minutes → 307-redirect to it. For .docx
// we redirect through the Office Online viewer so it previews in the browser;
// PDFs redirect straight to the signed URL.
//
// A signed URL is a bearer token, so the real protections are: (1) only a
// logged-in user can mint one, and (2) it dies after 10 minutes.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_BUCKETS = new Set(['course-outlines', 'seating-charts']);
const EXPIRES_IN_SECONDS = 600; // 10 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('b') ?? '';
    const key = searchParams.get('k') ?? '';

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return new NextResponse('Bad request', { status: 400 });
    }
    // Path-traversal / malformed-key guard.
    if (!key || key.startsWith('/') || key.includes('..')) {
      return new NextResponse('Bad request', { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, EXPIRES_IN_SECONDS);

    if (error || !data?.signedUrl) {
      return new NextResponse('Not found', { status: 404 });
    }

    // .docx (and anything not a PDF) → Office Online preview; PDF → direct.
    // To make docx fully private (no third party), redirect to data.signedUrl here too.
    const target = key.toLowerCase().endsWith('.pdf')
      ? data.signedUrl
      : `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(data.signedUrl)}`;

    const res = NextResponse.redirect(target, 307);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch {
    return new NextResponse('Error', { status: 500 });
  }
}
