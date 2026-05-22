'use client';

import { TERM1_WEEKS } from '@/data/term1courses';

// Block groupings for the Gantt header
const BLOCK_GROUPS: Array<{ label: string; isExam: boolean; indices: number[] }> = [
  { label: 'B1', isExam: false, indices: [0, 1] },
  { label: 'B2', isExam: false, indices: [2, 3] },
  { label: 'E',  isExam: true,  indices: [4] },
  { label: 'B3', isExam: false, indices: [5, 6] },
  { label: 'B4', isExam: false, indices: [7, 8, 9] },
  { label: 'B5', isExam: false, indices: [10, 11] },
  { label: 'B6', isExam: false, indices: [12, 13] },
];

// Compute course spans once at module level (TERM1_WEEKS is static)
const _buildSpans = () => {
  const map = new Map<string, { isWaw: boolean; weeks: Set<number> }>();
  TERM1_WEEKS.forEach((wd, idx) => {
    wd.courses.forEach(c => {
      if (!map.has(c.name)) map.set(c.name, { isWaw: c.isWaw, weeks: new Set() });
      map.get(c.name)!.weeks.add(idx);
    });
  });
  const core: Array<{ name: string; weeks: Set<number> }> = [];
  const waw: Array<{ name: string; weeks: Set<number> }> = [];
  map.forEach((v, name) => {
    (v.isWaw ? waw : core).push({ name, weeks: v.weeks });
  });
  return { core, waw };
};

const SPANS = _buildSpans();
const CELL_W = 11;
const LABEL_W = 85;
const INTER_GAP = 3;   // gap between block groups
const INTRA_GAP = 1;   // gap between weeks within a block

export function Term1GanttPanel({ activeWeekIndices }: { activeWeekIndices: number[] }) {
  const active = new Set(activeWeekIndices);

  const renderCell = (idx: number, hasCourse: boolean, isWaw: boolean) => {
    const isActive = active.has(idx);
    const isExamWk = TERM1_WEEKS[idx].isExam;

    let bg = 'transparent';
    let border = '1px solid transparent';

    if (isExamWk && !hasCourse) {
      bg = isActive ? '#fee2e2' : 'transparent';
      border = isActive ? '1px solid #fca5a5' : '1px solid transparent';
    } else if (hasCourse && isActive) {
      bg = isWaw ? '#f59e0b' : '#3b82f6';
      border = `1px solid ${isWaw ? '#d97706' : '#1d4ed8'}`;
    } else if (hasCourse) {
      bg = isWaw ? '#fde68a' : '#bfdbfe';
      border = `1px solid ${isWaw ? '#fcd34d' : '#93c5fd'}`;
    } else if (isActive) {
      bg = '#ede9fe';
      border = '1px solid #c7d2fe';
    }

    return (
      <div key={idx} style={{ width: CELL_W, height: 10, borderRadius: 2, backgroundColor: bg, border, flexShrink: 0 }} />
    );
  };

  const renderCourseRow = (name: string, isWaw: boolean, weeks: Set<number>) => {
    const runningNow = activeWeekIndices.some(i => weeks.has(i));
    return (
      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: INTER_GAP, marginBottom: 2 }}>
        <span
          title={name}
          style={{
            width: LABEL_W, flexShrink: 0, fontSize: 9,
            color: runningNow ? (isWaw ? '#92400e' : '#1e40af') : '#9ca3af',
            fontWeight: runningNow ? 600 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
        {BLOCK_GROUPS.map(grp => (
          <div key={grp.label} style={{ display: 'flex', gap: INTRA_GAP }}>
            {grp.indices.map(idx => renderCell(idx, weeks.has(idx), isWaw))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '10px 12px', backgroundColor: '#f5f3ff', height: '100%' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>
        Term 1 · Full Timeline
      </div>

      {/* Block label + week number header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: INTER_GAP, marginBottom: 6 }}>
        <div style={{ width: LABEL_W, flexShrink: 0 }} />
        {BLOCK_GROUPS.map(grp => {
          const grpActive = grp.indices.some(i => active.has(i));
          return (
            <div key={grp.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{
                fontSize: 7, fontWeight: 700,
                color: grp.isExam ? '#c2410c' : grpActive ? '#4338ca' : '#a5b4fc',
                backgroundColor: grp.isExam ? '#fff7ed' : grpActive ? '#e0e7ff' : 'transparent',
                borderRadius: 2, padding: '0 2px', lineHeight: 1.4,
              }}>
                {grp.label}
              </span>
              <div style={{ display: 'flex', gap: INTRA_GAP }}>
                {grp.indices.map(idx => {
                  const isActive = active.has(idx);
                  const isExamWk = TERM1_WEEKS[idx].isExam;
                  return (
                    <div key={idx} style={{
                      width: CELL_W, height: 12, borderRadius: 2, flexShrink: 0,
                      backgroundColor: isActive
                        ? (isExamWk ? '#f97316' : '#6366f1')
                        : isExamWk ? '#fed7aa' : '#e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 7, lineHeight: 1, color: isActive ? 'white' : '#94a3b8', fontWeight: isActive ? 700 : 400 }}>
                        {TERM1_WEEKS[idx].week}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Core course rows */}
      {SPANS.core.map(({ name, weeks }) => renderCourseRow(name, false, weeks))}

      {/* WaW divider + rows */}
      {SPANS.waw.length > 0 && (
        <>
          <div style={{ height: 1, backgroundColor: '#fde68a', margin: '5px 0' }} />
          <div style={{ fontSize: 8, color: '#b45309', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
            WaW Courses
          </div>
          {SPANS.waw.map(({ name, weeks }) => renderCourseRow(name, true, weeks))}
        </>
      )}

      {/* Legend */}
      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 10, height: 8, borderRadius: 2, backgroundColor: '#3b82f6', border: '1px solid #1d4ed8' }} />
          <span style={{ fontSize: 8, color: '#6b7280' }}>Current block</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 10, height: 8, borderRadius: 2, backgroundColor: '#bfdbfe', border: '1px solid #93c5fd' }} />
          <span style={{ fontSize: 8, color: '#6b7280' }}>Other weeks</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 10, height: 8, borderRadius: 2, backgroundColor: '#ede9fe', border: '1px solid #c7d2fe' }} />
          <span style={{ fontSize: 8, color: '#6b7280' }}>No T1 course</span>
        </div>
      </div>
    </div>
  );
}
