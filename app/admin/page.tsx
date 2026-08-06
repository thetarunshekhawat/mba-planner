'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { isAdminEmail, isSuperAdminEmail } from '@/lib/admin';

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
      if (!isAdminEmail(email)) {
        router.replace('/planner');
      } else {
        setAdminUserId(user.id);
        setIsSuperAdmin(isSuperAdminEmail(email));
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
