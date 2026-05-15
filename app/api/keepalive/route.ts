import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Called by Vercel Cron every 3 days — prevents Supabase free-tier project pausing
export async function GET() {
  const supabase = await createClient();
  await supabase.from('cohort_whitelist').select('count').limit(1);
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
