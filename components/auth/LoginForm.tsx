'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PROFESSORS } from '@/data/professors';
import { ProfessorRing } from './ProfessorRing';
import { FactTicker } from './FactTicker';

const ANGLE_PER = 360 / PROFESSORS.length;

export function LoginForm() {
  const supabase = createClient();
  const router = useRouter();

  // Auth state
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Ring state
  const [activeIdx, setActiveIdx] = useState(0);
  const [ringAngle, setRingAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [dispersing, setDispersing] = useState(false);

  // Info section state
  const [displayCourse, setDisplayCourse] = useState(PROFESSORS[0].course);
  const [displayName, setDisplayName] = useState(PROFESSORS[0].name);
  const [factIdx, setFactIdx] = useState(0);
  const [factKey, setFactKey] = useState(0);

  const [courseKey, setCourseKey] = useState(0);
  const prevActiveIdx = useRef(0);

  // Update displayed text whenever active professor changes.
  // While dragging: update immediately so course name flips live.
  // After release (snap/momentum): debounce 560ms so we wait for ring to settle.
  useEffect(() => {
    if (activeIdx === prevActiveIdx.current) return;
    prevActiveIdx.current = activeIdx;

    const delay = isDragging ? 0 : 560;
    const timer = setTimeout(() => {
      const prof = PROFESSORS[activeIdx];
      setDisplayCourse(prof.course);
      setDisplayName(prof.name);
      setFactIdx(0);
      setFactKey(k => k + 1);
      setCourseKey(k => k + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [activeIdx, isDragging]);

  // Cycle facts every 7s when idle
  useEffect(() => {
    if (isDragging) return;
    const interval = setInterval(() => {
      setFactIdx(i => {
        const next = (i + 1) % PROFESSORS[activeIdx].facts.length;
        setFactKey(k => k + 1);
        return next;
      });
    }, 7000);
    return () => clearInterval(interval);
  }, [isDragging, activeIdx]);

  const handleAngleChange = useCallback((a: number) => setRingAngle(a), []);
  const handleActiveChange = useCallback((i: number) => setActiveIdx(i), []);
  const handleDragChange = useCallback((d: boolean) => setIsDragging(d), []);
  const handleIntroComplete = useCallback(() => setIntroComplete(true), []);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setErrorMsg('');

    const { data: entry } = await supabase
      .from('cohort_whitelist')
      .select('email')
      .ilike('email', email.trim())
      .maybeSingle();

    if (!entry) {
      setStatus('error');
      setErrorMsg('Email not in BITSoM MBA Co\'27 cohort list.');
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
    });

    if (error) {
      setStatus('error');
      let msg = error.message;
      if (!msg || msg === '{}') msg = 'Failed to send code. Check Supabase SMTP settings.';
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } else {
      setStatus('idle');
      setStep('otp');
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 6) return;
    setStatus('loading');
    setErrorMsg('');

    const { error } = await supabase.auth.verifyOtp({
      email: email.toLowerCase().trim(),
      token: otp,
      type: 'email',
    });

    if (error) {
      setStatus('error');
      setErrorMsg('Invalid or expired code.');
    } else {
      setStatus('idle');
      setDispersing(true);
      setTimeout(() => router.push('/planner'), 850);
    }
  }

  async function handleResend() {
    setStatus('loading');
    setOtp('');
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
    });
    if (error) {
      setStatus('error');
      setErrorMsg('Failed to resend. Try again.');
    } else {
      setStatus('idle');
    }
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col items-center justify-center"
      style={{ background: '#000', userSelect: 'none' }}
    >
      {/* Ring */}
      <div className="flex items-center justify-center">
        <ProfessorRing
          professors={PROFESSORS}
          onActiveChange={handleActiveChange}
          onAngleChange={handleAngleChange}
          onDragChange={handleDragChange}
          onIntroComplete={handleIntroComplete}
          dispersing={dispersing}
        >
          {/* Only the login form lives in the ring center */}
          <div
            className="flex flex-col items-center gap-2 text-center"
            style={{ width: 148 }}
          >
            <p
              className="text-white/20 text-[9px] tracking-[0.25em] uppercase"
              style={{ letterSpacing: '0.22em' }}
            >
              MBA Planner
            </p>

            {step === 'otp' ? (
              <div className="flex flex-col items-center gap-2 w-full">
                <p className="text-white/30 text-[9px]">code sent ✓</p>
                <form onSubmit={handleOtpSubmit} className="w-full flex flex-col items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="········"
                    autoFocus
                    className="w-full bg-transparent border-b text-white text-[11px] placeholder:text-white/20 focus:outline-none pb-0.5 text-center transition-colors"
                    style={{ borderColor: 'rgba(255,255,255,0.22)', letterSpacing: '0.35em' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.55)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.22)')}
                  />
                  {status === 'error' && (
                    <p className="text-red-400/65 text-[9px] leading-snug text-center">
                      {errorMsg}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={status === 'loading' || otp.length < 6}
                    className="text-white/35 hover:text-white/75 text-base transition-colors disabled:opacity-25 mt-0.5"
                  >
                    {status === 'loading' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      '→'
                    )}
                  </button>
                </form>
                <div className="flex gap-3">
                  <button
                    onClick={handleResend}
                    className="text-white/20 text-[9px] hover:text-white/45 transition"
                  >
                    resend
                  </button>
                  <button
                    onClick={() => { setStep('email'); setOtp(''); setStatus('idle'); setErrorMsg(''); }}
                    className="text-white/20 text-[9px] hover:text-white/45 transition"
                  >
                    ← back
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="w-full flex flex-col items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@bitsom.edu.in"
                  required
                  className="w-full bg-transparent border-b text-white text-[11px] placeholder:text-white/20 focus:outline-none pb-0.5 text-center transition-colors"
                  style={{ borderColor: 'rgba(255,255,255,0.22)' }}
                  onFocus={e =>
                    (e.target.style.borderColor = 'rgba(255,255,255,0.55)')
                  }
                  onBlur={e =>
                    (e.target.style.borderColor = 'rgba(255,255,255,0.22)')
                  }
                />
                {status === 'error' && (
                  <p className="text-red-400/65 text-[9px] leading-snug text-center">
                    {errorMsg.length > 50 ? errorMsg.slice(0, 50) + '…' : errorMsg}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={status === 'loading' || !email}
                  className="text-white/35 hover:text-white/75 text-base transition-colors disabled:opacity-25 mt-0.5"
                >
                  {status === 'loading' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    '→'
                  )}
                </button>
              </form>
            )}
          </div>
        </ProfessorRing>
      </div>

      {/* Info section — below ring */}
      <div
        className="flex flex-col items-center text-center px-8 pb-0 pt-7"
        style={{
          minHeight: 148,
          opacity: introComplete && !dispersing ? 1 : 0,
          transform: introComplete && !dispersing ? 'translateY(0)' : 'translateY(14px)',
          transition: 'opacity 0.55s ease, transform 0.55s ease',
        }}
      >
        {/* Course name — word-by-word staggered flip on professor change */}
        <style>{`
          @keyframes wordFlipIn {
            from {
              transform: rotateX(-22deg) translateY(5px);
              opacity: 0;
            }
            to {
              transform: rotateX(0deg) translateY(0px);
              opacity: 1;
            }
          }
        `}</style>
        <div
          key={courseKey}
          className="text-white/60 text-sm font-medium"
          style={{
            perspective: '500px',
            display: 'flex',
            gap: '0.3em',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {displayCourse.split(' ').map((word, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                transformOrigin: 'center center',
                animation: `wordFlipIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both`,
                animationDelay: `${i * 110}ms`,
              }}
            >
              {word}
            </span>
          ))}
        </div>

        {/* Professor name — fades in when ring stops */}
        <p
          className="text-white/75 text-[11px] tracking-[0.18em] uppercase mt-2 transition-all duration-300"
          style={{
            opacity: isDragging ? 0 : 1,
            transform: isDragging ? 'translateY(5px)' : 'translateY(0)',
          }}
        >
          {displayName}
        </p>

        {/* Divider */}
        <div
          className="my-3 transition-all duration-300"
          style={{
            width: isDragging ? 0 : 32,
            height: 1,
            background: 'rgba(255,255,255,0.15)',
          }}
        />

        {/* Fact — typewriter effect when ring is stopped */}
        <div
          className="max-w-[280px] min-h-[44px] transition-opacity duration-300"
          style={{ opacity: isDragging ? 0 : 1 }}
        >
          {!isDragging && (
            <FactTicker
              key={`fact-${activeIdx}-${factKey}`}
              text={PROFESSORS[activeIdx].facts[factIdx]}
            />
          )}
        </div>
      </div>
    </div>
  );
}
