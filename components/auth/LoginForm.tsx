'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { GraduationCap, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    // Check whitelist
    const { data: entry } = await supabase
      .from('cohort_whitelist')
      .select('email')
      .ilike('email', email.trim())
      .maybeSingle();

    if (!entry) {
      setStatus('error');
      setErrorMsg('This email is not in the BITSoM MBA cohort list. Please use your college email.');
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus('error');
      // If the error message is literally "{}" (common with some SMTP misconfigurations) or empty
      let msg = error.message;
      if (!msg || msg === '{}') {
        msg = 'Failed to send email. Please verify your Supabase SMTP credentials (App Password) and rate limits.';
      }
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } else {
      setStatus('sent');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500 mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">MBA Planner</h1>
          <p className="text-slate-400 mt-2">BITSoM · Year 2 · Co&apos;27</p>
          <p className="text-slate-500 text-sm mt-1">Terms 4–6 · 48 Credits</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          {status === 'sent' ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/20 mb-2">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
              <h2 className="text-white font-semibold text-lg">Check your inbox</h2>
              <p className="text-slate-400 text-sm">
                We&apos;ve sent a magic login link to <span className="text-white font-medium">{email}</span>.
                Click the link to access your planner.
              </p>
              <p className="text-slate-500 text-xs mt-4">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  onClick={() => setStatus('idle')}
                  className="text-orange-400 hover:underline"
                >
                  try again
                </button>.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-white font-semibold text-lg">Sign in to plan your courses</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Enter your college email — we&apos;ll send you a one-click login link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2 font-medium">College email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="yourname@bitsomcollege.edu"
                      required
                      className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                {status === 'error' && (
                  <div className="flex items-start gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{errorMsg}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={status === 'loading' || !email}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {status === 'loading' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending link...</>
                  ) : (
                    'Send magic link'
                  )}
                </Button>
              </form>

              <p className="text-slate-500 text-xs text-center mt-6">
                Only BITSoM MBA Co&apos;27 cohort emails are accepted.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
