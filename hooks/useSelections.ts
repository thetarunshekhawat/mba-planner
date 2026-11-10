'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { takeOnceBlockerById } from '@/lib/takeOnce';
import { leadOf, followersOf } from '@/lib/linkedCourses';

type OnEvent = (type: 'course_selected' | 'course_removed', courseId: number) => void;

/**
 * `readOnly` is the demo account (lib/demo.ts). Toggles still move local
 * state so the planner feels live, but nothing is written and no analytics
 * event fires. The database refuses these writes anyway (migration 015);
 * skipping them here just avoids a click that visibly snaps back.
 */
export function useSelections(userId: string | null, onEvent?: OnEvent, readOnly = false) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  // Stable ref so toggle doesn't need onEvent in its dependency array
  const onEventRef = useRef<OnEvent | undefined>(onEvent);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    supabase
      .from('course_selections')
      .select('course_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) {
          const loaded = new Set(data.map(r => r.course_id as number));
          // Follow-on courses (FEDM-II): a saved lead without its follower gets the
          // follower now, the same as picking the lead today would.
          const missing = [...loaded].flatMap(followersOf).filter(id => !loaded.has(id));
          missing.forEach(id => loaded.add(id));
          setSelected(loaded);
          if (missing.length > 0 && !readOnly) {
            supabase
              .from('course_selections')
              .upsert(missing.map(course_id => ({ user_id: userId, course_id })))
              .then(() => {});
          }
        }
        setLoading(false);
      });
  }, [userId]);

  const toggle = useCallback(async (courseId: number) => {
    if (!userId) return;
    // Take-once programs (Vertex): never add a second run. The cards and the course
    // detail show why; this is the backstop for every caller.
    if (!selected.has(courseId) && takeOnceBlockerById(courseId, selected)) return;
    // Follow-on courses (FEDM-II) move with their lead, never on their own. The one
    // exception is unticking an old pick whose lead isn't selected.
    const lead = leadOf(courseId);
    if (lead !== undefined && (selected.has(lead) || !selected.has(courseId))) return;

    const removing = selected.has(courseId);
    // The course plus any follow-on course that moves with it.
    const ids = [courseId, ...followersOf(courseId)].filter(id => selected.has(id) === removing);

    const next = new Set(selected);
    ids.forEach(id => (removing ? next.delete(id) : next.add(id)));
    setSelected(next);
    if (readOnly) return;

    if (removing) {
      const { error } = await supabase
        .from('course_selections')
        .delete()
        .eq('user_id', userId)
        .in('course_id', ids);
      if (error) {
        setSelected(new Set(selected));
      } else {
        ids.forEach(id => onEventRef.current?.('course_removed', id));
      }
    } else {
      const { error } = await supabase
        .from('course_selections')
        .insert(ids.map(course_id => ({ user_id: userId, course_id })));
      if (error) {
        setSelected(new Set(selected));
      } else {
        ids.forEach(id => onEventRef.current?.('course_selected', id));
      }
    }
  }, [userId, selected, readOnly]);

  const selectBatch = useCallback(async (courseIds: number[]) => {
    if (!userId || courseIds.length === 0) return;
    // Same take-once rule as toggle; also stops one batch from adding both Vertex runs.
    const toAdd: number[] = [];
    for (const id of courseIds) {
      if (selected.has(id) || toAdd.includes(id)) continue;
      if (takeOnceBlockerById(id, new Set([...selected, ...toAdd]))) continue;
      if (leadOf(id) !== undefined) continue; // follow-on: added with its lead below
      toAdd.push(id);
    }
    for (const id of [...toAdd]) {
      for (const f of followersOf(id)) if (!selected.has(f) && !toAdd.includes(f)) toAdd.push(f);
    }
    if (toAdd.length === 0) return;
    const next = new Set(selected);
    toAdd.forEach(id => next.add(id));
    setSelected(next);
    if (readOnly) return;
    await supabase
      .from('course_selections')
      .upsert(toAdd.map(course_id => ({ user_id: userId, course_id })));
  }, [userId, selected, readOnly]);

  const deselectBatch = useCallback(async (courseIds: number[]) => {
    if (!userId || courseIds.length === 0) return;
    // A follow-on course leaves only with its lead.
    const leads = courseIds.filter(id => selected.has(id) && leadOf(id) === undefined);
    const toRemove = [
      ...leads,
      ...leads.flatMap(followersOf).filter(id => selected.has(id)),
      ...courseIds.filter(id => {
        const lead = leadOf(id);
        return lead !== undefined && selected.has(id) && !selected.has(lead);
      }),
    ].filter((id, i, a) => a.indexOf(id) === i);
    if (toRemove.length === 0) return;
    const next = new Set(selected);
    toRemove.forEach(id => next.delete(id));
    setSelected(next);
    if (readOnly) return;
    await supabase
      .from('course_selections')
      .delete()
      .eq('user_id', userId)
      .in('course_id', toRemove);
  }, [userId, selected, readOnly]);

  return { selected, loading, toggle, selectBatch, deselectBatch };
}
