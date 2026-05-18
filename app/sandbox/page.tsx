'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Star, BookOpen, GraduationCap, LayoutList, CalendarDays,
  LogOut, CheckCircle2, PlusCircle, X,
} from 'lucide-react';
import { SPECS, ALL_COURSES } from '@/data/courses';
import type { Course, SpecId } from '@/types';

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────
const MOCK_USER = { name: 'Tarun Shekhawat', email: 'tarun@bitsom.edu.in' };
const DEMO = ALL_COURSES.filter(c => c.type !== 'exam' && c.type !== 'free').slice(0, 20);
const TOTAL_CREDITS = 16;
const SPEC_CREDITS = 6;

// ─── THEMES ─────────────────────────────────────────────────────────────────
type ThemeId = 'brutalist' | 'arctic' | 'kyoto' | 'greenhouse' | 'ultraviolet' | 'mist' | 'scholar' | 'blush';

interface ThemeDef {
  name: string;
  desc: string;
  swatch: string;
  fontUrl: string;
  vars: string;
}

const THEMES: Record<ThemeId, ThemeDef> = {
  brutalist: {
    name: '01 · Brutalist',
    desc: 'Raw. Stark. No apologies.',
    swatch: '#ff2424',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700;800&family=Courier+Prime:wght@400;700&display=swap',
    vars: `
      --bg:#0a0a0a; --surface:#111; --raised:#1a1a1a; --card:#1f1f1f;
      --dim:#2c2c2c; --mid:#444;
      --accent:#ff2424; --accent-dim:rgba(255,36,36,0.1); --glow:rgba(255,36,36,0.07);
      --action:#ff2424; --action-dim:rgba(255,36,36,0.08);
      --cream:#f0f0f0; --sand:#aaa; --ash:#606060;
      --cal-bg:#0a0a0a; --cal-card:#181818; --cal-border:#2c2c2c;
      --cal-text:#f0f0f0; --cal-muted:#777; --cal-head:#111;
      --font-display:"Space Grotesk",sans-serif; --font-body:"Space Grotesk",sans-serif; --font-mono:"Courier Prime",monospace;
      --radius:0px; --radius-sm:0px; --radius-pill:2px;
      --card-border:1px solid #2c2c2c; --accent-strip:none;
    `,
  },
  arctic: {
    name: '02 · Arctic',
    desc: 'Frost. Depth. Limitless.',
    swatch: '#00c8ee',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
    vars: `
      --bg:#030d1e; --surface:#071426; --raised:#0d1e3c; --card:#112448;
      --dim:#193060; --mid:#274a88;
      --accent:#00c8ee; --accent-dim:rgba(0,200,238,0.12); --glow:rgba(0,200,238,0.18);
      --action:#0094bb; --action-dim:rgba(0,148,187,0.12);
      --cream:#d4edff; --sand:#5a9acc; --ash:#2e5a8a;
      --cal-bg:#030d1e; --cal-card:#0d1e3c; --cal-border:#193060;
      --cal-text:#d4edff; --cal-muted:#5a9acc; --cal-head:#071426;
      --font-display:"Plus Jakarta Sans",sans-serif; --font-body:"Plus Jakarta Sans",sans-serif; --font-mono:"JetBrains Mono",monospace;
      --radius:10px; --radius-sm:6px; --radius-pill:999px;
      --card-border:1px solid rgba(0,200,238,0.14); --accent-strip:none;
    `,
  },
  kyoto: {
    name: '03 · Kyoto',
    desc: 'Ink. Space. Precision.',
    swatch: '#bf3028',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Mulish:wght@400;500;600;700&display=swap',
    vars: `
      --bg:#f6f2ea; --surface:#ede7db; --raised:#e3ddd0; --card:#faf7f2;
      --dim:#d8d0c0; --mid:#b4a890;
      --accent:#bf3028; --accent-dim:rgba(191,48,40,0.07); --glow:rgba(191,48,40,0.05);
      --action:#bf3028; --action-dim:rgba(191,48,40,0.07);
      --cream:#1a1008; --sand:#5a4838; --ash:#9a8a78;
      --cal-bg:#f6f2ea; --cal-card:#faf7f2; --cal-border:#d8d0c0;
      --cal-text:#1a1008; --cal-muted:#7a6a58; --cal-head:#ede7db;
      --font-display:"Libre Baskerville",Georgia,serif; --font-body:"Mulish",system-ui,sans-serif; --font-mono:"Courier Prime",monospace;
      --radius:3px; --radius-sm:2px; --radius-pill:3px;
      --card-border:1px solid #d8d0c0; --accent-strip:none;
    `,
  },
  greenhouse: {
    name: '04 · Greenhouse',
    desc: 'Grow bold. Stay sharp.',
    swatch: '#a8e800',
    fontUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Instrument+Sans:wght@400;500;600;700&display=swap',
    vars: `
      --bg:#050f05; --surface:#0a1a0a; --raised:#0f220f; --card:#152815;
      --dim:#1e3420; --mid:#2c4e2e;
      --accent:#a8e800; --accent-dim:rgba(168,232,0,0.11); --glow:rgba(168,232,0,0.09);
      --action:#84c000; --action-dim:rgba(132,192,0,0.1);
      --cream:#d4f0b4; --sand:#78b850; --ash:#487030;
      --cal-bg:#050f05; --cal-card:#0f220f; --cal-border:#1e3420;
      --cal-text:#d4f0b4; --cal-muted:#78b850; --cal-head:#0a1a0a;
      --font-display:"DM Serif Display",Georgia,serif; --font-body:"Instrument Sans",system-ui,sans-serif; --font-mono:"JetBrains Mono",monospace;
      --radius:6px; --radius-sm:4px; --radius-pill:999px;
      --card-border:1px solid rgba(168,232,0,0.13); --accent-strip:3px solid var(--accent);
    `,
  },
  ultraviolet: {
    name: '05 · Ultraviolet',
    desc: 'Beyond visible. Beyond limits.',
    swatch: '#b858ff',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap',
    vars: `
      --bg:#060414; --surface:#0c0824; --raised:#130e32; --card:#18123c;
      --dim:#221a50; --mid:#382878;
      --accent:#b858ff; --accent-dim:rgba(184,88,255,0.15); --glow:rgba(184,88,255,0.2);
      --action:#8c30e0; --action-dim:rgba(140,48,224,0.14);
      --cream:#e8d4ff; --sand:#9870d8; --ash:#543898;
      --cal-bg:#060414; --cal-card:#130e32; --cal-border:#221a50;
      --cal-text:#e8d4ff; --cal-muted:#9870d8; --cal-head:#0c0824;
      --font-display:"Syne",system-ui,sans-serif; --font-body:"DM Sans",system-ui,sans-serif; --font-mono:"JetBrains Mono",monospace;
      --radius:14px; --radius-sm:8px; --radius-pill:999px;
      --card-border:1px solid rgba(184,88,255,0.18); --accent-strip:none;
    `,
  },

  // ── Kyoto family: light, minimal, serif ──────────────────────────────────

  mist: {
    name: '06 · Nordic Mist',
    desc: 'Cool air. Quiet clarity.',
    swatch: '#2e7d52',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Nunito+Sans:wght@300;400;600;700&display=swap',
    vars: `
      --bg:#f0f4f7; --surface:#e3eaef; --raised:#d6e0e8; --card:#f8fafc;
      --dim:#c8d5de; --mid:#9ab0be;
      --accent:#2e7d52; --accent-dim:rgba(46,125,82,0.09); --glow:rgba(46,125,82,0.06);
      --action:#2e7d52; --action-dim:rgba(46,125,82,0.08);
      --cream:#18252e; --sand:#3e6070; --ash:#7a9aaa;
      --cal-bg:#f0f4f7; --cal-card:#f8fafc; --cal-border:#c8d5de;
      --cal-text:#18252e; --cal-muted:#4a7080; --cal-head:#e3eaef;
      --font-display:"Cormorant Garamond",Georgia,serif; --font-body:"Nunito Sans",system-ui,sans-serif; --font-mono:"JetBrains Mono",monospace;
      --radius:5px; --radius-sm:3px; --radius-pill:4px;
      --card-border:1px solid #c8d5de; --accent-strip:none;
    `,
  },

  scholar: {
    name: '07 · Scholar',
    desc: 'Prestige. Depth. Permanence.',
    swatch: '#1e3a6e',
    fontUrl: 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Lato:wght@300;400;700&display=swap',
    vars: `
      --bg:#fef7e0; --surface:#f5ecca; --raised:#ecdeb0; --card:#fffef5;
      --dim:#dfd0a0; --mid:#c0a870;
      --accent:#1e3a6e; --accent-dim:rgba(30,58,110,0.09); --glow:rgba(30,58,110,0.06);
      --action:#1e3a6e; --action-dim:rgba(30,58,110,0.08);
      --cream:#160e02; --sand:#4a3010; --ash:#9a7840;
      --cal-bg:#fef7e0; --cal-card:#fffef5; --cal-border:#dfd0a0;
      --cal-text:#160e02; --cal-muted:#5a4020; --cal-head:#f5ecca;
      --font-display:"EB Garamond",Georgia,serif; --font-body:"Lato",system-ui,sans-serif; --font-mono:"Courier Prime",monospace;
      --radius:3px; --radius-sm:2px; --radius-pill:3px;
      --card-border:1px solid #dfd0a0; --accent-strip:none;
    `,
  },

  blush: {
    name: '08 · Blush',
    desc: 'Refined warmth. Quiet luxury.',
    swatch: '#8b1a2f',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap',
    vars: `
      --bg:#fdf0ec; --surface:#f5e2da; --raised:#ecd4ca; --card:#fffaf8;
      --dim:#e0c8c0; --mid:#c0a098;
      --accent:#8b1a2f; --accent-dim:rgba(139,26,47,0.08); --glow:rgba(139,26,47,0.05);
      --action:#8b1a2f; --action-dim:rgba(139,26,47,0.07);
      --cream:#1f0e0c; --sand:#6a3030; --ash:#b08888;
      --cal-bg:#fdf0ec; --cal-card:#fffaf8; --cal-border:#e0c8c0;
      --cal-text:#1f0e0c; --cal-muted:#6a3030; --cal-head:#f5e2da;
      --font-display:"Playfair Display",Georgia,serif; --font-body:"DM Sans",system-ui,sans-serif; --font-mono:"Courier Prime",monospace;
      --radius:4px; --radius-sm:2px; --radius-pill:4px;
      --card-border:1px solid #e0c8c0; --accent-strip:none;
    `,
  },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function normalizeWorkload(w: string) {
  const l = w?.toLowerCase() ?? '';
  if (l.includes('high') || l.includes('heavy')) return { label: 'Heavy', color: '#ff4444', bg: 'rgba(255,68,68,0.12)' };
  if (l.includes('moderate')) return { label: 'Moderate', color: 'var(--accent)', bg: 'var(--accent-dim)' };
  return { label: 'Light', color: '#4cdd88', bg: 'rgba(76,221,136,0.12)' };
}

function Stars({ value, size = 11 }: { value: number; size?: number }) {
  return (
    <span style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} style={{ width: size, height: size }}
          fill={i < value ? 'var(--accent)' : 'none'}
          stroke={i < value ? 'var(--accent)' : 'var(--mid)'}
          strokeWidth={1.5} />
      ))}
    </span>
  );
}

// ─── RIPPLE BUTTON ─────────────────────────────────────────────────────────────
type Ripple = { id: number; x: number; y: number };
function RippleBtn({ onClick, style, className, children }: {
  onClick?: () => void; style?: React.CSSProperties;
  className?: string; children: React.ReactNode;
}) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const fire = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples(p => [...p, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setRipples(p => p.filter(x => x.id !== id)), 560);
    onClick?.();
  }, [onClick]);
  return (
    <button onClick={fire} className={`relative overflow-hidden ${className ?? ''}`} style={style}>
      {ripples.map(r => (
        <span key={r.id} className="animate-ripple absolute rounded-full pointer-events-none"
          style={{ left: r.x, top: r.y, width: 8, height: 8, marginLeft: -4, marginTop: -4, background: 'rgba(255,255,255,0.25)' }} />
      ))}
      {children}
    </button>
  );
}

// ─── THEME SWITCHER ────────────────────────────────────────────────────────────
function ThemeSwitcher({ active, onChange }: { active: ThemeId; onChange: (t: ThemeId) => void }) {
  return (
    <div style={{
      background: 'var(--surface)', borderBottom: '1px solid var(--dim)',
      padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ash)', marginRight: 6, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
        Preview
      </span>
      {(Object.entries(THEMES) as [ThemeId, ThemeDef][]).map(([id, t]) => (
        <button key={id} onClick={() => onChange(id)} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px',
          borderRadius: 'var(--radius-pill)', cursor: 'pointer', transition: 'all 180ms',
          border: active === id ? `1px solid var(--accent)` : '1px solid var(--dim)',
          background: active === id ? 'var(--accent-dim)' : 'transparent',
          color: active === id ? 'var(--accent)' : 'var(--sand)',
          fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.swatch, flexShrink: 0 }} />
          {t.name}
        </button>
      ))}
      <span style={{ marginLeft: 'auto', fontSize: 10, fontStyle: 'italic', color: 'var(--ash)', fontFamily: 'var(--font-body)' }}>
        {THEMES[active].desc}
      </span>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ selected, userSpecs, onSpecToggle, mounted }: {
  selected: Set<number>; userSpecs: SpecId[];
  onSpecToggle: (s: SpecId) => void; mounted: boolean;
}) {
  const electives = DEMO.filter(c => c.type === 'elective');
  const selectedElectives = electives.filter(c => selected.has(c.id)).length;

  return (
    <aside className="animate-sidebar-section-in" style={{
      width: 240, flexShrink: 0,
      background: 'var(--surface)', borderRight: '1px solid var(--dim)',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      {/* User */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--dim)' }} className="animate-sidebar-section-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-pill)', background: 'var(--accent)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, fontFamily: 'var(--font-display)', flexShrink: 0 }}>
            T
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', fontFamily: 'var(--font-body)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{MOCK_USER.name}</p>
            <p style={{ fontSize: 11, color: 'var(--ash)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{MOCK_USER.email}</p>
          </div>
          <LogOut style={{ width: 14, height: 14, color: 'var(--ash)', flexShrink: 0 }} />
        </div>
      </div>

      {/* Specializations */}
      <div style={{ padding: 16, borderBottom: '1px solid var(--dim)' }} className="animate-sidebar-section-in" >
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ash)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
          My Specializations
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {SPECS.map(s => {
            const active = userSpecs.includes(s.id);
            return (
              <button key={s.id} onClick={() => onSpecToggle(s.id)} style={{
                padding: '4px 9px', fontSize: 10, fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: active ? `1px solid ${s.color}` : '1px solid var(--dim)',
                background: active ? s.color + '22' : 'transparent',
                color: active ? s.color : 'var(--sand)',
                cursor: 'pointer', transition: 'all 150ms', fontFamily: 'var(--font-body)',
              }}>
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding: 16, borderBottom: '1px solid var(--dim)' }} className="animate-sidebar-section-in">
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ash)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
          Progress
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Electives bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--sand)', fontFamily: 'var(--font-body)' }}>
                <BookOpen style={{ width: 11, height: 11 }} /> Electives
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cream)', fontFamily: 'var(--font-mono)' }}>
                {selectedElectives}/{TOTAL_CREDITS}
              </span>
            </div>
            <div style={{ height: 5, background: 'var(--dim)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 'var(--radius-pill)', background: 'var(--accent)', width: mounted ? `${(selectedElectives / TOTAL_CREDITS) * 100}%` : '0%', transition: 'width 700ms cubic-bezier(0.22,1,0.36,1)' }} />
            </div>
          </div>
          {/* Per-spec bars */}
          {userSpecs.map(specId => {
            const spec = SPECS.find(s => s.id === specId);
            if (!spec) return null;
            const specCourses = DEMO.filter(c => c.type === 'elective' && c.specs.includes(specId));
            const picked = specCourses.filter(c => selected.has(c.id)).length;
            return (
              <div key={specId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: spec.color, fontFamily: 'var(--font-body)' }}>{spec.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cream)', fontFamily: 'var(--font-mono)' }}>{picked}/{SPEC_CREDITS}</span>
                </div>
                <div style={{ height: 5, background: 'var(--dim)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 'var(--radius-pill)', background: spec.color, width: mounted ? `${Math.min((picked / SPEC_CREDITS) * 100, 100)}%` : '0%', transition: 'width 700ms cubic-bezier(0.22,1,0.36,1) 150ms' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters label */}
      <div style={{ padding: '14px 16px 8px', flex: 1 }} className="animate-sidebar-section-in">
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ash)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
          Filters
        </p>
        {['Min Learning Depth', 'Min Career Relevance', 'Workload'].map(label => (
          <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid var(--dim)' }}>
            <span style={{ fontSize: 11, color: 'var(--sand)', fontFamily: 'var(--font-body)' }}>{label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ─── HEADER / VIEW TOGGLE ─────────────────────────────────────────────────────
function Header({ viewMode, setViewMode, selectedCount }: {
  viewMode: 'plan' | 'calendar'; setViewMode: (v: 'plan' | 'calendar') => void; selectedCount: number;
}) {
  return (
    <div style={{
      background: 'var(--raised)', borderBottom: '1px solid var(--dim)',
      padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--cream)', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
          Course Planner
        </span>
        <span style={{ fontSize: 10, color: 'var(--ash)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
          BITSoM MBA · Year 2
        </span>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', position: 'relative', background: 'var(--dim)', borderRadius: 'var(--radius)', padding: 3, gap: 0 }}>
        {/* Sliding pill */}
        <div style={{
          position: 'absolute', top: 3, bottom: 3,
          width: 'calc(50% - 3px)',
          background: 'var(--accent)',
          borderRadius: 'var(--radius-sm)',
          transform: viewMode === 'plan' ? 'translateX(0%)' : 'translateX(calc(100% + 2px))',
          transition: '250ms cubic-bezier(0.34,1.56,0.64,1)',
          left: 3,
          opacity: 0.15,
        }} />
        {(['plan', 'calendar'] as const).map(v => (
          <button key={v} onClick={() => setViewMode(v)} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
            borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', cursor: 'pointer',
            color: viewMode === v ? 'var(--accent)' : 'var(--sand)',
            fontSize: 11, fontWeight: 600, zIndex: 1, transition: 'color 200ms', fontFamily: 'var(--font-body)',
          }}>
            {v === 'plan' ? <LayoutList style={{ width: 12, height: 12 }} /> : <CalendarDays style={{ width: 12, height: 12 }} />}
            {v === 'plan' ? 'Plan' : 'Calendar'}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'var(--font-mono)' }}>
        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{selectedCount}</span> / {TOTAL_CREDITS} credits
      </div>
    </div>
  );
}

// ─── COURSE CARD ──────────────────────────────────────────────────────────────
function CourseCard({ course, isSelected, onToggle, onClick, delay = 0 }: {
  course: Course; isSelected: boolean; onToggle: () => void; onClick: () => void; delay?: number;
}) {
  const isWaw = course.type === 'waw';
  const isMandatory = course.type === 'mandatory';
  const isFixed = isWaw || isMandatory;
  const primarySpec = SPECS.find(s => course.specs.includes(s.id));

  let accentColor = 'var(--mid)';
  if (isWaw) accentColor = 'var(--accent)';
  else if (isMandatory) accentColor = '#3b7fd4';
  else if (primarySpec) accentColor = primarySpec.color;

  const wl = normalizeWorkload(course.review?.workload ?? '');
  const [hovered, setHovered] = useState(false);

  return (
    <div className="animate-planner-card-in" style={{ animationDelay: `${delay}ms`, position: 'relative' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div onClick={onClick} style={{
        background: isSelected && !isFixed ? 'var(--raised)' : 'var(--card)',
        border: isSelected && !isFixed ? `1px solid ${accentColor}44` : 'var(--card-border)',
        borderLeft: `var(--accent-strip, none)`,
        borderRadius: 'var(--radius)',
        padding: '14px 14px 14px 16px',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hovered ? `0 4px 20px var(--glow)` : 'none',
        transition: 'transform 180ms, box-shadow 180ms, border-color 180ms, background 200ms',
        outline: isSelected && !isFixed ? `1px solid ${accentColor}33` : 'none',
        outlineOffset: -1,
      }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {course.specs.slice(0, 2).map(specId => {
              const s = SPECS.find(x => x.id === specId);
              return s ? (
                <span key={specId} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-sm)', border: `1px solid ${s.color}55`, color: s.color, background: s.color + '18', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                  {s.id}
                </span>
              ) : null;
            })}
            {isWaw && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)', color: 'var(--accent)', background: 'var(--accent-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                WAW
              </span>
            )}
          </div>
          <div onClick={e => { e.stopPropagation(); onToggle(); }} style={{ display: 'contents' }}>
          <RippleBtn style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-pill)', border: `1px solid ${isSelected ? accentColor : 'var(--mid)'}`,
            background: isSelected ? accentColor + '22' : 'transparent',
            color: isSelected ? accentColor : 'var(--ash)', cursor: 'pointer', transition: 'all 200ms',
          }}>
            {isFixed ? null : isSelected
              ? <CheckCircle2 style={{ width: 13, height: 13 }} />
              : <PlusCircle style={{ width: 13, height: 13 }} />
            }
          </RippleBtn>
          </div>
        </div>

        {/* Title */}
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--cream)', fontFamily: 'var(--font-display)', margin: '0 0 3px 0', lineHeight: 1.3 }}>
          {course.name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--sand)', margin: '0 0 10px 0', fontFamily: 'var(--font-body)' }}>
          {course.faculty ?? 'TBD'}
        </p>

        {/* Ratings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[{ label: 'DEPTH', val: course.review?.learningDepth }, { label: 'CAREER', val: course.review?.careerRelevance }].map(({ label, val }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ash)', width: 44, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>{label}</span>
              <Stars value={val ?? 0} />
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ash)', width: 44, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>LOAD</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: wl.bg, color: wl.color, fontFamily: 'var(--font-body)' }}>
              {wl.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LIST VIEW ─────────────────────────────────────────────────────────────────
function ListView({ selected, onToggle, onDetail }: {
  selected: Set<number>; onToggle: (id: number) => void; onDetail: (c: Course) => void;
}) {
  // Group by term
  const termMap: Record<number, Course[]> = {};
  DEMO.forEach(c => {
    const t = c.term ?? 4;
    if (!termMap[t]) termMap[t] = [];
    termMap[t].push(c);
  });

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
      {Object.entries(termMap).map(([term, courses], ti) => {
        // Group courses into week groups of 3
        const weeks: Course[][] = [];
        for (let i = 0; i < courses.length; i += 3) weeks.push(courses.slice(i, i + 3));

        return (
          <div key={term} className="animate-planner-term-in" style={{ marginBottom: 32, animationDelay: `${ti * 80}ms` }}>
            {/* Term header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ height: 1, flex: 0, width: 32, background: 'var(--accent)', marginRight: 12 }} />
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '-0.02em' }}>
                Term {term}
              </h2>
              <div style={{ flex: 1, height: 1, background: 'var(--dim)', marginLeft: 12 }} />
            </div>

            {weeks.map((group, wi) => (
              <div key={wi} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ash)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8, paddingLeft: 2 }}>
                  WK {wi * 2 + 1}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(group.length, 3)}, 1fr)`, gap: 10 }}>
                  {group.map((c, ci) => (
                    <CourseCard key={c.id} course={c}
                      isSelected={selected.has(c.id)}
                      onToggle={() => onToggle(c.id)}
                      onClick={() => onDetail(c)}
                      delay={ci * 40}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── CALENDAR VIEW ────────────────────────────────────────────────────────────
function CalendarView({ selected, onToggle }: {
  selected: Set<number>; onToggle: (id: number) => void;
}) {
  const termMap: Record<number, Course[]> = {};
  DEMO.forEach(c => { const t = c.term ?? 4; if (!termMap[t]) termMap[t] = []; termMap[t].push(c); });

  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%', background: 'var(--cal-bg)' }}>
      {Object.entries(termMap).map(([term, courses], ti) => (
        <div key={term} className="animate-planner-card-in" style={{ marginBottom: 28, animationDelay: `${ti * 80}ms` }}>
          <div style={{ background: 'var(--cal-head)', border: '1px solid var(--cal-border)', borderRadius: 'var(--radius)', padding: '8px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cal-text)', fontFamily: 'var(--font-display)' }}>Term {term}</span>
            <span style={{ fontSize: 10, color: 'var(--cal-muted)', fontFamily: 'var(--font-mono)' }}>{courses.length} courses</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {courses.map((c, ci) => {
              const primarySpec = SPECS.find(s => c.specs.includes(s.id));
              const color = c.type === 'waw' ? 'var(--accent)' : primarySpec?.color ?? 'var(--mid)';
              const isSelected = selected.has(c.id);
              return (
                <div key={c.id} className="animate-planner-card-in" style={{ animationDelay: `${ci * 30 + ti * 80}ms` }}>
                  <button onClick={() => onToggle(c.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    background: isSelected ? color + '18' : 'var(--cal-card)',
                    border: `1px solid ${isSelected ? color + '55' : 'var(--cal-border)'}`,
                    borderLeft: `3px solid ${color}`, borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', transition: 'all 180ms', textAlign: 'left',
                  }}>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--cal-text)', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--cal-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                      {c.faculty?.split(' ').pop() ?? 'TBD'}
                    </span>
                    {isSelected && <CheckCircle2 style={{ width: 13, height: 13, color, flexShrink: 0 }} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ course, onClose }: { course: Course; onClose: () => void }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 100); return () => clearTimeout(t); }, []);
  const primarySpec = SPECS.find(s => course.specs.includes(s.id));
  const color = course.type === 'waw' ? 'var(--accent)' : primarySpec?.color ?? 'var(--accent)';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 420, height: '100%', background: 'var(--surface)', borderLeft: '1px solid var(--dim)',
        overflowY: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Close */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 'var(--radius-pill)', border: '1px solid var(--dim)', background: 'var(--raised)', color: 'var(--sand)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Header */}
        <div className={vis ? 'animate-modal-block-in' : ''} style={{ opacity: vis ? 1 : 0 }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
            {course.specs.map(specId => {
              const s = SPECS.find(x => x.id === specId);
              return s ? <span key={specId} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: `1px solid ${s.color}55`, color: s.color, background: s.color + '18', fontFamily: 'var(--font-mono)' }}>{s.id}</span> : null;
            })}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--cream)', fontFamily: 'var(--font-display)', margin: '0 0 6px 0', lineHeight: 1.2 }}>
            {course.name}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--sand)', margin: 0, fontFamily: 'var(--font-body)' }}>{course.faculty ?? 'TBD'}</p>
        </div>

        {/* Ratings */}
        <div className={vis ? 'animate-modal-block-in' : ''} style={{ opacity: vis ? 1 : 0, animationDelay: '60ms', background: 'var(--raised)', borderRadius: 'var(--radius)', padding: 16, border: 'var(--card-border)' }}>
          {[{ label: 'Learning Depth', val: course.review?.learningDepth }, { label: 'Career Relevance', val: course.review?.careerRelevance }].map(({ label, val }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--sand)', fontFamily: 'var(--font-body)' }}>{label}</span>
              <Stars value={val ?? 0} size={14} />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--sand)', fontFamily: 'var(--font-body)' }}>Workload</span>
            {(() => { const wl = normalizeWorkload(course.review?.workload ?? ''); return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-sm)', background: wl.bg, color: wl.color, fontFamily: 'var(--font-body)' }}>{wl.label}</span>; })()}
          </div>
        </div>

        {/* Highlights */}
        {course.review?.highlights && course.review.highlights.length > 0 && (
          <div className={vis ? 'animate-modal-block-in' : ''} style={{ opacity: vis ? 1 : 0, animationDelay: '120ms' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ash)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>Highlights</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {course.review.highlights.slice(0, 4).map((h: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }} />
                  <span style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>{h}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <RippleBtn style={{
          marginTop: 'auto', width: '100%', padding: '12px',
          background: color, borderRadius: 'var(--radius)',
          border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
          color: '#fff', fontFamily: 'var(--font-body)', letterSpacing: '0.02em',
        }} className={vis ? 'animate-modal-block-in' : ''}>
          Add to Plan
        </RippleBtn>
      </div>
    </div>
  );
}

// ─── SANDBOX PAGE ──────────────────────────────────────────────────────────────
export default function SandboxPage() {
  const [activeTheme, setActiveTheme] = useState<ThemeId>('kyoto');
  const [selected, setSelected] = useState(new Set<number>([1, 3, 7]));
  const [userSpecs, setUserSpecs] = useState<SpecId[]>(['FIN', 'MKT']);
  const [viewMode, setViewMode] = useState<'plan' | 'calendar'>('plan');
  const [activeModal, setActiveModal] = useState<Course | null>(null);
  const [mounted, setMounted] = useState(false);

  const theme = THEMES[activeTheme];
  useEffect(() => setMounted(true), []);

  const toggleCourse = useCallback((id: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const electives = DEMO.filter(c => c.type === 'elective');
  const selectedCount = electives.filter(c => selected.has(c.id)).length;

  const cssBlock = `.sandbox-root { ${theme.vars} }`;

  return (
    <>
      <link rel="stylesheet" href={theme.fontUrl} />
      <style dangerouslySetInnerHTML={{ __html: cssBlock }} />

      <div className="sandbox-root" style={{
        fontFamily: 'var(--font-body)', background: 'var(--bg)', color: 'var(--cream)',
        height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <ThemeSwitcher active={activeTheme} onChange={t => { setActiveTheme(t); setMounted(false); setTimeout(() => setMounted(true), 50); }} />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar selected={selected} userSpecs={userSpecs} onSpecToggle={id => setUserSpecs(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id])} mounted={mounted} />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Header viewMode={viewMode} setViewMode={setViewMode} selectedCount={selectedCount} />
            <div key={viewMode} className="animate-view-fade-in" style={{ flex: 1, overflow: 'hidden' }}>
              {viewMode === 'plan'
                ? <ListView selected={selected} onToggle={toggleCourse} onDetail={setActiveModal} />
                : <CalendarView selected={selected} onToggle={toggleCourse} />
              }
            </div>
          </main>
        </div>

        {activeModal && <Modal course={activeModal} onClose={() => setActiveModal(null)} />}

        <div style={{
          position: 'fixed', bottom: 14, right: 14,
          background: 'var(--accent)', color: 'var(--bg)',
          fontSize: 9, fontWeight: 800, padding: '4px 10px',
          borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-mono)',
          letterSpacing: '0.1em', zIndex: 9000,
        }}>
          SANDBOX
        </div>
      </div>
    </>
  );
}
