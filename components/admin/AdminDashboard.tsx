'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ALL_COURSES, SPECS } from '@/data/courses';
import type { Profile, SpecId, Course } from '@/types';
import { GraduationCap, Search, Users, BookOpen, TrendingUp, ChevronRight, ArrowLeft, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MemberSelection {
  user_id: string;
  course_id: number;
}

type Tab = 'overview' | 'member';

export function AdminDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selections, setSelections] = useState<MemberSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [overviewExpandedCourse, setOverviewExpandedCourse] = useState<number | null>(null);
  const [overviewExpandedSpec, setOverviewExpandedSpec] = useState<SpecId | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('course_selections').select('user_id, course_id'),
    ]).then(([{ data: p }, { data: s }]) => {
      setProfiles((p ?? []) as Profile[]);
      setSelections((s ?? []) as MemberSelection[]);
      setLoading(false);
    });
  }, []);

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  // ── Derived cohort stats ──────────────────────────────────────────────────

  const selectionsByUser = new Map<string, Set<number>>();
  for (const s of selections) {
    if (!selectionsByUser.has(s.user_id)) selectionsByUser.set(s.user_id, new Set());
    selectionsByUser.get(s.user_id)!.add(s.course_id);
  }

  const membersWithSelections = profiles.filter(p => (selectionsByUser.get(p.id)?.size ?? 0) > 0).length;
  const avgSelections = profiles.length
    ? (selections.length / profiles.length).toFixed(1)
    : '0';

  const specCounts: Record<SpecId, number> = { FIN: 0, OPS: 0, ENT: 0, ECOM: 0, MKT: 0, LSTR: 0 };
  for (const p of profiles) {
    for (const s of p.specializations) specCounts[s as SpecId]++;
  }
  const maxSpecCount = Math.max(...Object.values(specCounts), 1);

  const courseCounts = new Map<number, number>();
  for (const s of selections) {
    courseCounts.set(s.course_id, (courseCounts.get(s.course_id) ?? 0) + 1);
  }
  const courseRanking = ALL_COURSES
    .filter(c => c.type === 'elective')
    .map(c => ({ course: c, count: courseCounts.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const top10 = courseRanking.slice(0, 10);
  const unpopular = courseRanking.filter(r => r.count === 0);

  // ── Member detail helpers ─────────────────────────────────────────────────

  const memberCourseIds = selectedMember ? (selectionsByUser.get(selectedMember.id) ?? new Set<number>()) : new Set<number>();

  const memberCourses = ALL_COURSES
    .filter(c => memberCourseIds.has(c.id))
    .sort((a, b) => a.term - b.term || (a.block ?? 0) - (b.block ?? 0));

  const groupedByBlock = memberCourses.reduce<Map<string, Course[]>>((acc, c) => {
    const key = `Term ${c.term} · Block ${c.block ?? '?'} (${c.dates})`;
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)!.push(c);
    return acc;
  }, new Map());

  // Who else is taking a given course
  function whoElseTaking(courseId: number): Profile[] {
    return profiles.filter(p =>
      p.id !== selectedMember?.id &&
      (selectionsByUser.get(p.id)?.has(courseId) ?? false)
    );
  }

  if (loading) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading cohort data...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-slate-900/95 border-b border-white/10 sticky top-0 z-30">
        <button
          onClick={() => router.push('/planner')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Planner
        </button>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">Admin Dashboard</span>
          <span className="text-slate-500 text-xs">· BITSoM Co&apos;27</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left — member list */}
        <div className="w-64 flex-shrink-0 border-r border-white/10 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search members..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <p className="text-slate-500 text-[10px] mt-2">{profiles.length} cohort members</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredProfiles.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedMember(p); setTab('member'); setExpandedCourse(null); }}
                className={`w-full text-left px-3 py-2.5 border-b border-white/5 hover:bg-slate-800 transition-colors ${
                  selectedMember?.id === p.id ? 'bg-slate-800 border-l-2 border-l-orange-500' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-200 text-xs font-medium truncate">{p.name || p.email.split('@')[0]}</span>
                  <span className="text-slate-500 text-[10px] shrink-0">
                    {selectionsByUser.get(p.id)?.size ?? 0}
                  </span>
                </div>
                {p.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.specializations.map(s => {
                      const spec = SPECS.find(sp => sp.id === s);
                      return spec ? (
                        <span
                          key={s}
                          className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: spec.color + '33', color: spec.color }}
                        >
                          {spec.id}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right — content panel */}
        <div className="flex-1 overflow-y-auto">
          {/* Tabs */}
          <div className="sticky top-0 z-10 flex gap-1 px-4 pt-4 pb-2 bg-slate-900 border-b border-white/5">
            <button
              onClick={() => setTab('overview')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === 'overview' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cohort Overview
            </button>
            <button
              onClick={() => setTab('member')}
              disabled={!selectedMember}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === 'member' && selectedMember
                  ? 'bg-white text-slate-900'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {selectedMember ? `${selectedMember.name || selectedMember.email.split('@')[0]}` : 'Member Detail'}
            </button>
          </div>

          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && (
            <div className="p-4 space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: Users, label: 'Total Members', value: profiles.length, color: 'text-blue-400' },
                  { icon: BookOpen, label: 'Have a Plan', value: membersWithSelections, color: 'text-green-400' },
                  { icon: TrendingUp, label: 'Avg Courses', value: avgSelections, color: 'text-orange-400' },
                  { icon: ChevronRight, label: 'Total Selections', value: selections.length, color: 'text-purple-400' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="bg-slate-800 rounded-xl p-4 border border-white/5">
                    <Icon className={`w-5 h-5 ${color} mb-2`} />
                    <div className="text-2xl font-bold text-white">{value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Spec popularity */}
              <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                <h3 className="text-sm font-semibold text-slate-200 mb-4">Specialization Popularity</h3>
                <div className="space-y-2.5">
                  {SPECS.map(spec => {
                    const count = specCounts[spec.id];
                    const pct = (count / maxSpecCount) * 100;
                    const isExpanded = overviewExpandedSpec === spec.id;
                    const specMembers = profiles.filter(p => p.specializations.includes(spec.id));
                    return (
                      <div key={spec.id}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setOverviewExpandedSpec(isExpanded ? null : spec.id)}
                            className="text-xs w-28 shrink-0 text-left hover:text-orange-300 transition-colors text-slate-400"
                            style={{ color: isExpanded ? spec.color : undefined }}
                          >
                            {spec.label}
                          </button>
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: spec.color }}
                            />
                          </div>
                          <span className="text-xs text-slate-300 w-6 text-right">{count}</span>
                        </div>
                        {isExpanded && (
                          <div className="mt-1.5 mb-1 ml-0 bg-slate-700/40 rounded-lg p-3">
                            <p className="text-[10px] text-slate-400 font-semibold mb-2 uppercase tracking-wide">
                              {spec.label} members ({specMembers.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {specMembers.map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => { setSelectedMember(p); setTab('member'); setOverviewExpandedSpec(null); setExpandedCourse(null); }}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-600 text-slate-200 hover:bg-orange-500/20 hover:text-orange-300 transition-colors"
                                >
                                  {p.name || p.email.split('@')[0]}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top 10 most selected */}
                <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">Most Selected Courses</h3>
                  <div className="space-y-2">
                    {top10.map(({ course, count }, i) => {
                      const pct = profiles.length ? Math.round((count / profiles.length) * 100) : 0;
                      const spec = SPECS.find(s => course.specs.includes(s.id));
                      const isExpanded = overviewExpandedCourse === course.id;
                      const takers = profiles.filter(p => selectionsByUser.get(p.id)?.has(course.id) ?? false);
                      return (
                        <div key={course.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => setOverviewExpandedCourse(isExpanded ? null : course.id)}
                                className="text-xs text-slate-200 truncate hover:text-orange-300 transition-colors text-left w-full"
                              >
                                {course.name}
                              </button>
                              <div className="flex items-center gap-1 mt-0.5">
                                <div className="h-1 rounded-full flex-1 bg-slate-700">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: spec?.color ?? '#64748b',
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-slate-300 shrink-0">{count} ({pct}%)</span>
                          </div>
                          {isExpanded && (
                            <div className="mt-1.5 mb-1 ml-6 bg-slate-700/40 rounded-lg p-3">
                              <p className="text-[10px] text-slate-400 font-semibold mb-2 uppercase tracking-wide">
                                Enrolled ({takers.length})
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {takers.map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => { setSelectedMember(p); setTab('member'); setOverviewExpandedCourse(null); setExpandedCourse(null); }}
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-600 text-slate-200 hover:bg-orange-500/20 hover:text-orange-300 transition-colors"
                                  >
                                    {p.name || p.email.split('@')[0]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Unpopular / zero selections */}
                <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">
                    No Takers Yet
                    <span className="ml-2 text-[10px] text-slate-500 font-normal">({unpopular.length} courses)</span>
                  </h3>
                  {unpopular.length === 0 ? (
                    <p className="text-xs text-slate-500">Every elective has at least one person interested.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {unpopular.map(({ course }) => (
                        <div key={course.id} className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                          <span className="truncate">{course.name}</span>
                          <span className="shrink-0 text-slate-600">{course.code}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── MEMBER DETAIL TAB ── */}
          {tab === 'member' && selectedMember && (
            <div className="p-4 space-y-4">
              {/* Profile header */}
              <div className="bg-slate-800 rounded-xl p-4 border border-white/5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-white font-semibold text-base">{selectedMember.name}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{selectedMember.email}</div>
                  {selectedMember.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedMember.specializations.map(s => {
                        const spec = SPECS.find(sp => sp.id === s);
                        return spec ? (
                          <span
                            key={s}
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: spec.color + '33', color: spec.color }}
                          >
                            {spec.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-4 shrink-0 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">{memberCourseIds.size}</div>
                    <div className="text-[10px] text-slate-400">courses</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{selectedMember.specializations.length}</div>
                    <div className="text-[10px] text-slate-400">specs</div>
                  </div>
                </div>
              </div>

              {memberCourses.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-10">
                  {selectedMember.name} hasn't selected any courses yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from(groupedByBlock.entries()).map(([blockLabel, courses]) => (
                    <div key={blockLabel} className="bg-slate-800 rounded-xl border border-white/5 overflow-hidden">
                      <div className="px-4 py-2 bg-slate-700/50 border-b border-white/5">
                        <span className="text-xs font-semibold text-slate-300">{blockLabel}</span>
                      </div>
                      <div className="divide-y divide-white/5">
                        {courses.map(course => {
                          const spec = SPECS.find(s => course.specs.includes(s.id));
                          const accentColor = course.type === 'waw'
                            ? '#d97706'
                            : course.type === 'mandatory'
                            ? '#2563eb'
                            : spec?.color ?? '#64748b';
                          const others = whoElseTaking(course.id);
                          const isExpanded = expandedCourse === course.id;

                          return (
                            <div key={course.id}>
                              <div className="flex items-center gap-3 px-4 py-2.5">
                                <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-slate-200">{course.name}</div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    {course.faculty} · {course.type}
                                    {course.code ? ` · ${course.code}` : ''}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors shrink-0 ml-2"
                                >
                                  <Users className="w-3 h-3" />
                                  <span>{others.length} others</span>
                                  {isExpanded ? <X className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </button>
                              </div>

                              {isExpanded && (
                                <div className="px-4 pb-3 pt-0">
                                  <div className="bg-slate-700/40 rounded-lg p-3">
                                    <p className="text-[10px] text-slate-400 font-semibold mb-2 uppercase tracking-wide">
                                      Also enrolled ({others.length})
                                    </p>
                                    {others.length === 0 ? (
                                      <p className="text-[10px] text-slate-500">Nobody else selected this course.</p>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {others.map(o => (
                                          <button
                                            key={o.id}
                                            onClick={() => { setSelectedMember(o); setExpandedCourse(null); }}
                                            className="text-[10px] px-2 py-0.5 rounded-full bg-slate-600 text-slate-200 hover:bg-orange-500/20 hover:text-orange-300 transition-colors"
                                          >
                                            {o.name || o.email.split('@')[0]}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Placeholder when member tab selected but no member */}
          {tab === 'member' && !selectedMember && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500 text-sm gap-2">
              <Users className="w-10 h-10 text-slate-700" />
              <p>Select a member from the list to view their plan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
