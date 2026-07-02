// Structured, deterministic "actions" the chatbot surfaces beneath a reply: an outline
// link, a schedule export, etc. The model NEVER emits these — the server computes them
// from the resolved intent and the matched course, mirroring the admin SQL feature's
// "never trust raw model output" stance. The client renders them as tappable chips and
// runs the matching handler (links open directly; exports call the planner's existing
// export functions). Write actions (course ticking) would be added later behind an
// explicit confirm step; v1 intentionally ships only read/link/export actions.

import type { Course } from '@/types';
import { fileHref } from '@/lib/storageLinks';

/** Control char (RS) separating streamed prose from a trailing actions JSON payload.
 *  It never appears in LLM prose, so the client can split the stream cleanly without a
 *  second request or a fragile text marker. */
export const ACTIONS_SENTINEL = String.fromCharCode(0x1e);

/** Tabs / dialogs the assistant can send the student to via a "take me there" button. */
export type NavTarget = 'plan' | 'schedule' | 'friends' | 'export';

export type ChatAction =
  | { type: 'open_link'; label: string; url: string; courseCode?: string }
  | { type: 'export_pdf'; label: string }
  | { type: 'export_ics'; label: string }
  | { type: 'export_subscription'; provider: 'google' | 'apple'; label: string }
  // Switches the planner to a tab (or opens the Export dialog) — handled by the planner
  // page, not the chat widget.
  | { type: 'navigate'; label: string; target: NavTarget }
  // A drill-down chip: tapping it sends `question` as the next message (handled inside
  // the chat widget, not by the planner page).
  | { type: 'ask'; label: string; question: string };

/** The outline-document link for a course, if one is on file. */
export function outlineLinkAction(course: Course): ChatAction | null {
  if (!course.outlineUrl) return null;
  return {
    type: 'open_link',
    label: `Open ${course.name} outline`,
    url: fileHref(course.outlineUrl),
    courseCode: course.code,
  };
}

/** One drill-down chip per friend: tapping asks for that friend's full course list. */
export function friendAskActions(friendNames: string[]): ChatAction[] {
  return friendNames
    .filter((n) => n && n.trim())
    .map((name) => ({
      type: 'ask',
      label: name,
      question: `What is ${name} taking?`,
    }));
}

/** Export options the student can trigger from chat (the client runs these against
 *  its own schedule state, so no course data is needed here). PDF is first — it's the
 *  format most students reach for. The trailing "Open Export" chip takes them to the
 *  dialog where they can change which term(s) are included. */
export function exportActions(): ChatAction[] {
  return [
    { type: 'export_pdf', label: 'Download as PDF' },
    { type: 'export_ics', label: 'Download .ics file' },
    { type: 'export_subscription', provider: 'google', label: 'Add to Google Calendar' },
    { type: 'export_subscription', provider: 'apple', label: 'Add to Apple Calendar' },
    { type: 'navigate', label: 'Open Export', target: 'export' },
  ];
}

// Feature → nav chip mapping for "where is X?" / "take me to X" questions. Ordered so the
// most specific feature wins; each entry contributes at most one chip.
const NAV_RULES: { target: NavTarget; label: string; keywords: string[] }[] = [
  {
    target: 'friends',
    label: 'Go to Friends tab',
    keywords: ['friend code', 'add friend', 'add a friend', 'friend', 'friends', 'classmate'],
  },
  {
    target: 'export',
    label: 'Open Export',
    keywords: ['export', 'download', 'pdf', 'ics', 'calendar', 'subscribe', 'subscription'],
  },
  {
    target: 'schedule',
    label: 'Go to My Schedule',
    keywords: ['my schedule', 'schedule', 'timetable', 'time table'],
  },
  {
    target: 'plan',
    label: 'Go to Plan',
    keywords: ['plan tab', 'browse', 'filter', 'all courses', 'select a course', 'pick a course', 'specialization', 'specialisation'],
  },
];

export type NavigateAction = Extract<ChatAction, { type: 'navigate' }>;

/** Deterministic "take me there" chips for messages that ask where a feature is. Returns
 *  at most two, most-specific-first, so navigation help never floods the reply. */
export function navActions(message: string): NavigateAction[] {
  const norm = ` ${message.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  const out: NavigateAction[] = [];
  for (const rule of NAV_RULES) {
    if (rule.keywords.some((kw) => norm.includes(` ${kw} `))) {
      out.push({ type: 'navigate', label: rule.label, target: rule.target });
    }
    if (out.length >= 2) break;
  }
  return out;
}

/** Encode actions as the trailing stream frame (sentinel + JSON). */
export function encodeActionsFrame(actions: ChatAction[]): string {
  return ACTIONS_SENTINEL + JSON.stringify({ actions });
}
