'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

const ADMIN_EMAILS = new Set([
  'tarun.shekhawat2027@bitsom.edu.in',
  'varad.dharap2027@bitsom.edu.in',
  'yash.kolhe2027@bitsom.edu.in',
  'apoorv.sharma2027@bitsom.edu.in',
]);

const SUPER_ADMIN_EMAIL = 'tarun.shekhawat2027@bitsom.edu.in';

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [adminUserId, setAdminUserId] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/'); return; }
      const email = user.email?.toLowerCase() ?? '';
      if (!ADMIN_EMAILS.has(email)) {
        router.replace('/planner');
      } else {
        setAdminUserId(user.id);
        setIsSuperAdmin(email === SUPER_ADMIN_EMAIL);
        setReady(true);
      }
    });
  }, []);

  if (!ready) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return <AdminDashboard adminUserId={adminUserId} isSuperAdmin={isSuperAdmin} />;
}
