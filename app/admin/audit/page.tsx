'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuditDashboard } from '@/components/admin/AuditDashboard';

const SUPER_ADMIN_EMAIL = 'tarun.shekhawat2027@bitsom.edu.in';

export default function AuditPage() {
  const supabase = createClient();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [adminUserId, setAdminUserId] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const email = user?.email?.toLowerCase() ?? '';
      if (email !== SUPER_ADMIN_EMAIL) { router.replace('/planner'); return; }
      setAdminUserId(user!.id);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return <AuditDashboard adminUserId={adminUserId} />;
}
