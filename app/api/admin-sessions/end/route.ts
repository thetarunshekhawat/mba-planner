import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const text = await request.text();
    const { session_id, actor_id, duration_seconds } = JSON.parse(text) as {
      session_id: string;
      actor_id: string;
      duration_seconds: number;
    };

    if (!session_id || !actor_id || typeof duration_seconds !== 'number') {
      return new NextResponse('Bad request', { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== actor_id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    await supabase.from('security_events').insert({
      actor_id,
      event_type: 'admin_session_end',
      payload: { session_id, duration_seconds: Math.round(duration_seconds) },
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse('Error', { status: 500 });
  }
}
