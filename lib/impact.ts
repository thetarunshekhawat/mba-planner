/**
 * Turning cohort hours into something a human can picture.
 *
 * "4,120 hours on the planner" is a number nobody has a feel for. "Enough
 * reading time for the whole Harry Potter series, two and a half times over"
 * is the same fact with a handle on it.
 *
 * Every figure here is checkable, which is the point — a comparison that
 * falls apart when someone does the arithmetic is worse than no comparison.
 * Word counts are the published ones; the reading pace is stated on the card
 * so nobody can accuse us of picking a flattering number.
 */

/** Standard adult fiction pace. Deliberately mid-range: 200 would flatter us. */
export const WORDS_PER_MINUTE = 250;

export interface Book {
  title: string;
  short: string;
  words: number;
}

export const HP_BOOKS: Book[] = [
  { title: "Harry Potter and the Philosopher's Stone", short: "Philosopher's Stone", words: 76_944 },
  { title: 'Harry Potter and the Chamber of Secrets',  short: 'Chamber of Secrets',  words: 85_141 },
  { title: 'Harry Potter and the Prisoner of Azkaban', short: 'Prisoner of Azkaban', words: 107_253 },
  { title: 'Harry Potter and the Goblet of Fire',      short: 'Goblet of Fire',      words: 190_637 },
  { title: 'Harry Potter and the Order of the Phoenix', short: 'Order of the Phoenix', words: 257_045 },
  { title: 'Harry Potter and the Half-Blood Prince',   short: 'Half-Blood Prince',   words: 168_923 },
  { title: 'Harry Potter and the Deathly Hallows',     short: 'Deathly Hallows',     words: 198_227 },
];

export const SERIES_WORDS = HP_BOOKS.reduce((n, b) => n + b.words, 0);          // 1,084,170
export const SERIES_MINUTES = SERIES_WORDS / WORDS_PER_MINUTE;                   // ≈ 4,337
export const SERIES_HOURS = SERIES_MINUTES / 60;                                // ≈ 72.3

export interface ReadingProgress {
  /** How many complete passes through all seven books. */
  loops: number;
  /** Books finished within the current pass, 0-7. */
  booksDone: number;
  /** 0-1 through the book currently being read, or 1 when the pass is complete. */
  fractionOfCurrent: number;
  /** The book they'd be inside right now, null once a pass is exactly complete. */
  currentBook: Book | null;
  /** One sentence for the card. */
  sentence: string;
}

/**
 * Walk the seven spines, not a bare multiplier. "2.9x the series" is a
 * statistic; "somewhere in the middle of Order of the Phoenix" is an image,
 * and the image is what gets repeated in the room afterwards.
 */
export function readingProgress(totalSeconds: number): ReadingProgress {
  const minutes = Math.max(0, totalSeconds) / 60;
  const loops = Math.floor(minutes / SERIES_MINUTES);
  let remaining = minutes - loops * SERIES_MINUTES;

  let booksDone = 0;
  let currentBook: Book | null = null;
  let fractionOfCurrent = 1;

  for (const book of HP_BOOKS) {
    const cost = book.words / WORDS_PER_MINUTE;
    if (remaining >= cost) {
      remaining -= cost;
      booksDone++;
      continue;
    }
    currentBook = book;
    fractionOfCurrent = cost === 0 ? 0 : remaining / cost;
    break;
  }

  return { loops, booksDone, fractionOfCurrent, currentBook, sentence: sentenceFor(loops, booksDone, fractionOfCurrent, currentBook) };
}

function sentenceFor(loops: number, booksDone: number, fraction: number, current: Book | null): string {
  const pct = Math.round(fraction * 100);

  // Under a single book: percentages of one spine read better than "0 books".
  if (loops === 0 && booksDone === 0) {
    if (pct < 1) return 'Not quite the first chapter of Philosopher’s Stone yet.';
    return `${pct}% of the way through Philosopher’s Stone.`;
  }

  const passes =
    loops === 0 ? '' :
    loops === 1 ? 'The entire seven-book series, once through' :
    loops === 2 ? 'The entire seven-book series, twice over' :
    `The entire seven-book series, ${loops} times over`;

  if (loops > 0 && booksDone === 0 && pct < 5) return `${passes}.`;

  const within =
    booksDone === 0 ? `${pct}% into ${current?.short}` :
    booksDone === 7 ? 'all seven books' :
    current === null ? `${booksDone} books` :
    pct < 5 ? `${booksDone} book${booksDone === 1 ? '' : 's'}, about to start ${current.short}`
            : `${booksDone} book${booksDone === 1 ? '' : 's'}, and ${pct}% into ${current.short}`;

  return loops === 0
    ? `${within[0].toUpperCase()}${within.slice(1)}.`
    : `${passes}, plus ${within}.`;
}

/** "1,240 hours" / "48 minutes" — hours once it stops being silly to say minutes. */
export function formatDuration(totalSeconds: number): { value: string; unit: string } {
  const hours = totalSeconds / 3600;
  if (hours < 1) return { value: Math.round(totalSeconds / 60).toLocaleString('en-IN'), unit: 'minutes' };
  if (hours < 10) return { value: hours.toFixed(1), unit: 'hours' };
  return { value: Math.round(hours).toLocaleString('en-IN'), unit: 'hours' };
}

/** Indian digit grouping, because the audience for this page is in Mumbai. */
export function formatCount(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString('en-IN');
}
