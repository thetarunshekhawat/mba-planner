// Admin "Ask the database" endpoint (text-to-SQL).
//
// Flow: auth + admin gate + rate limit → fetch the public-schema catalog →
// MiniMax-M3 writes a single read-only SELECT → app-level validation →
// execute through the admin_run_readonly_sql() RPC (the real safety boundary,
// see supabase/migrations/011_admin_ai.sql) → MiniMax-M3 summarizes the rows →
// audit-log → return JSON.
//
// The model's SQL is NEVER trusted: the DB function runs it read-only,
// SELECT-only, admin-only, public-schema-only, with a timeout and row cap.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { complete, ProviderError, isConfigured, ADMIN_MODEL } from '@/lib/chat/nemotron';

// Mirrors the hardcoded ADMIN_EMAILS set in app/admin/page.tsx (and the DB
// function). The DB function re-checks, so this is a fast first gate.
const ADMIN_EMAILS = new Set([
  'tarun.shekhawat2027@bitsom.edu.in',
  'varad.dharap2027@bitsom.edu.in',
  'yash.kolhe2027@bitsom.edu.in',
  'apoorv.sharma2027@bitsom.edu.in',
]);

const MAX_QUESTION_LEN = 1000;
const RATE_LIMIT_PER_MIN = 12;
const MAX_SQL_ATTEMPTS = 2;          // one retry if the first SQL errors
const ROWS_TO_SUMMARIZE = 50;        // cap rows sent to the summarizer (cost/latency)
const SCHEMA_TTL_MS = 5 * 60_000;    // re-fetch the schema catalog every 5 min

// In-module schema cache (survives across requests on a warm server).
let schemaCache: { text: string; at: number } | null = null;

interface QueryBody {
  question?: string;
}

/** Pull the SQL out of a model reply: strip ``` fences and any leading "sql". */
function extractSql(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  s = s.replace(/^sql\s*/i, '').trim();
  // Keep only up to the first statement terminator (defense; the DB also checks).
  s = s.replace(/;\s*$/, '').trim();
  return s;
}

/** App-level validation — belt-and-suspenders ahead of the DB guard. */
function validateSql(sql: string): string | null {
  if (!sql) return 'The model returned an empty query.';
  if (/;/.test(sql)) return 'Only a single statement is allowed.';
  if (!/^\s*(select|with)\b/i.test(sql)) return 'Only SELECT queries are allowed.';
  if (/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke)\b/i.test(sql)) {
    return 'Only read-only SELECT queries are allowed.';
  }
  if (/\b(auth|information_schema|storage|vault|extensions|graphql|graphql_public|realtime|supabase_functions|net|cron)\./i.test(sql)) {
    return 'Querying that schema is not allowed.';
  }
  if (/\bpg_[a-z]/i.test(sql)) return 'Querying system catalogs is not allowed.';
  return null;
}

function buildSystemPrompt(schemaText: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return [
    'You are a PostgreSQL expert that writes ONE read-only SQL query for an admin analytics dashboard.',
    'Output ONLY the raw SQL — no markdown, no code fences, no comments, no explanation.',
    '',
    'Hard rules:',
    '- Only SELECT or WITH. Never INSERT/UPDATE/DELETE/DDL. A single statement, no semicolons.',
    '- Use only the tables and columns listed in the schema below (PostgreSQL schema "public").',
    '- Timestamps are timestamptz stored in UTC. The cohort is in India; interpret clock times',
    '  the user gives as IST (Asia/Kolkata) and convert, e.g. (session_start AT TIME ZONE \'Asia/Kolkata\').',
    `- "today" means the current date in Asia/Kolkata. Server date (UTC) is ${today}.`,
    '- To show who someone is, JOIN to profiles (profiles.id = <table>.user_id) and select profiles.name, profiles.email.',
    '- "active"/"online"/"using the app" → user_sessions. A session overlaps a window [a,b] when',
    '  session_start < b AND (session_end IS NULL OR session_end > a).',
    '- "last login"/"hasn\'t logged in" → the user_last_sign_in view (user_id, email, last_sign_in_at).',
    '- Course picks → course_selections (course_id is an integer id, not a code).',
    '- Return human-friendly columns and order results sensibly. The system caps output at 5000 rows.',
    '',
    'Database schema (table: [columns]):',
    schemaText,
  ].join('\n');
}

async function loadSchemaText(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  if (schemaCache && Date.now() - schemaCache.at < SCHEMA_TTL_MS) return schemaCache.text;

  const { data, error } = await supabase.rpc('admin_schema');
  if (error) throw new Error(`schema introspection failed: ${error.message}`);

  const obj = (data ?? {}) as Record<string, string[]>;
  const text = Object.entries(obj)
    .map(([table, cols]) => `- ${table}(${cols.join(', ')})`)
    .join('\n');
  schemaCache = { text, at: Date.now() };
  return text;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!ADMIN_EMAILS.has((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'The assistant is not configured yet (missing model API key).' },
      { status: 503 },
    );
  }

  let body: QueryBody;
  try {
    body = (await request.json()) as QueryBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const question = (body.question ?? '').trim();
  if (!question) return NextResponse.json({ error: 'Empty question' }, { status: 400 });
  if (question.length > MAX_QUESTION_LEN) {
    return NextResponse.json({ error: 'Question too long' }, { status: 400 });
  }

  // ── Rate limit (mirrors app/api/chat/route.ts) ─────────────────────────────
  await supabase.from('user_events').insert({
    user_id: user.id,
    event_type: 'admin_ai_query',
    payload: { len: question.length },
  });
  const { count } = await supabase
    .from('user_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_type', 'admin_ai_query')
    .gte('occurred_at', new Date(Date.now() - 60_000).toISOString());
  if (count && count > RATE_LIMIT_PER_MIN) {
    return NextResponse.json(
      { error: "You're asking very fast — please slow down for a minute." },
      { status: 429 },
    );
  }

  const startedAt = Date.now();

  // Audit helper — best-effort, never blocks the response.
  const logQuery = (sql: string | null, rowCount: number | null, err: string | null) =>
    supabase
      .from('admin_ai_queries')
      .insert({
        actor_id: user.id,
        question,
        generated_sql: sql,
        row_count: rowCount,
        model: ADMIN_MODEL,
        latency_ms: Date.now() - startedAt,
        error: err,
      })
      .then(() => {}, () => {});

  try {
    const schemaText = await loadSchemaText(supabase);
    const systemPrompt = buildSystemPrompt(schemaText);

    // ── Generate SQL, retrying once if execution fails ───────────────────────
    let sql = '';
    let rows: Record<string, unknown>[] = [];
    let lastError = '';
    let succeeded = false;
    let correction = '';

    for (let attempt = 0; attempt < MAX_SQL_ATTEMPTS; attempt++) {
      const userContent = correction
        ? `Question: ${question}\n\nYour previous query failed with this error:\n${correction}\nReturn a corrected query (SQL only).`
        : `Question: ${question}`;

      const raw = await complete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        { model: ADMIN_MODEL, temperature: 0.1, maxTokens: 700, timeoutMs: 40_000 },
      );
      sql = extractSql(raw);

      const invalid = validateSql(sql);
      if (invalid) {
        lastError = invalid;
        correction = invalid;
        continue;
      }

      const { data, error } = await supabase.rpc('admin_run_readonly_sql', { query: sql });
      if (error) {
        lastError = error.message;
        correction = error.message;
        continue;
      }
      rows = (data ?? []) as Record<string, unknown>[];
      succeeded = true;
      break;
    }

    if (!succeeded) {
      await logQuery(sql || null, null, lastError);
      return NextResponse.json(
        {
          error: `Couldn't run that as a database query. ${lastError}`,
          sql: sql || null,
        },
        { status: 200 },
      );
    }

    const columns = rows.length ? Object.keys(rows[0]) : [];
    const rowCount = rows.length;

    // ── Summarize the rows in plain English ──────────────────────────────────
    let summary = '';
    try {
      const sample = rows.slice(0, ROWS_TO_SUMMARIZE);
      const summaryRaw = await complete(
        [
          {
            role: 'system',
            content:
              'You summarize SQL query results for a non-technical admin. Be brief (1–3 sentences), ' +
              'state the count, and never invent data not present in the rows. If there are no rows, ' +
              'say plainly that no records matched.',
          },
          {
            role: 'user',
            content:
              `Question: ${question}\n` +
              `Total rows: ${rowCount}${rowCount > sample.length ? ` (showing first ${sample.length})` : ''}\n` +
              `Rows (JSON): ${JSON.stringify(sample)}`,
          },
        ],
        { model: ADMIN_MODEL, temperature: 0.3, maxTokens: 350, timeoutMs: 30_000 },
      );
      summary = summaryRaw.trim();
    } catch {
      summary =
        rowCount === 0
          ? 'No records matched your question.'
          : `Found ${rowCount} matching ${rowCount === 1 ? 'record' : 'records'}.`;
    }

    await logQuery(sql, rowCount, null);

    return NextResponse.json({ summary, sql, columns, rows, rowCount });
  } catch (err) {
    const msg =
      err instanceof ProviderError
        ? "The model is busy right now — please try again in a moment."
        : err instanceof Error
          ? err.message
          : 'Unexpected error';
    await logQuery(null, null, msg);
    return NextResponse.json({ error: msg }, { status: 200 });
  }
}
