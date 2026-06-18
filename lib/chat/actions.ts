// Structured, deterministic "actions" the chatbot surfaces beneath a reply: an outline
// link, a schedule export, etc. The model NEVER emits these — the server computes them
// from the resolved intent and the matched course, mirroring the admin SQL feature's
// "never trust raw model output" stance. The client renders them as tappable chips and
// runs the matching handler (links open directly; exports call the planner's existing
// export functions). Write actions (course ticking) would be added later behind an
// explicit confirm step; v1 intentionally ships only read/link/export actions.

import type { Course } from '@/types';

/** Control char (RS) separating streamed prose from a trailing actions JSON payload.
 *  It never appears in LLM prose, so the client can split the stream cleanly without a
 *  second request or a fragile text marker. */
export const ACTIONS_SENTINEL = String.fromCharCode(0x1e);

export type ChatAction =
  | { type: 'open_link'; label: string; url: string; courseCode?: string }
  | { type: 'export_ics'; label: string }
  | { type: 'export_subscription'; provider: 'google' | 'apple'; label: string }
  // A drill-down chip: tapping it sends `question` as the next message (handled inside
  // the chat widget, not by the planner page).
  | { type: 'ask'; label: string; question: string };

/** The outline-document link for a course, if one is on file. */
export function outlineLinkAction(course: Course): ChatAction | null {
  if (!course.outlineUrl) return null;
  return {
    type: 'open_link',
    label: `Open ${course.name} outline`,
    url: course.outlineUrl,
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
 *  its own schedule state, so no course data is needed here). */
export function exportActions(): ChatAction[] {
  return [
    { type: 'export_ics', label: 'Download .ics file' },
    { type: 'export_subscription', provider: 'google', label: 'Add to Google Calendar' },
    { type: 'export_subscription', provider: 'apple', label: 'Add to Apple Calendar' },
  ];
}

/** Encode actions as the trailing stream frame (sentinel + JSON). */
export function encodeActionsFrame(actions: ChatAction[]): string {
  return ACTIONS_SENTINEL + JSON.stringify({ actions });
}
