// Single place that talks to the LLM provider. The whole app is provider-agnostic
// behind this file — to swap NVIDIA Nemotron for Claude/OpenAI later, only this file
// changes (endpoint, headers, body shape, SSE parsing).
//
// Uses the OpenAI-compatible NVIDIA NIM endpoint. The key is read from a server-only
// env var (NVIDIA_API_KEY) — it must NEVER be exposed to the client.

// 120B Nemotron — comfortable overkill for course Q&A, 1M context, fast. Same NVIDIA
// family as the 550B ultra, so the request/SSE shape below is identical.
// Alternatives on the free tier: 'openai/gpt-oss-120b', 'nvidia/nemotron-3-ultra-550b-a55b'.
export const CHAT_MODEL = 'nvidia/nemotron-3-super-120b-a12b';

// Model used by the admin "Ask the database" assistant (text-to-SQL). Strong
// instruction-following for SQL generation; reached through the same NVIDIA
// OpenAI-compatible endpoint, so only the model id differs.
export const ADMIN_MODEL = 'minimaxai/minimax-m3';

const BASE_URL = 'https://integrate.api.nvidia.com/v1';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  maxTokens?: number;
  temperature?: number;
  /** Overall request timeout (ms). Guards against the free tier hanging. */
  timeoutMs?: number;
  /** Override the model id. Defaults to CHAT_MODEL (the student chatbot model). */
  model?: string;
}

/** Thrown when the provider returns a non-2xx (e.g. 429 rate limit, 5xx). */
export class ProviderError extends Error {
  constructor(public status: number, public body: string) {
    super(`Provider error ${status}: ${body.slice(0, 200)}`);
    this.name = 'ProviderError';
  }
}

export function isConfigured(): boolean {
  return !!process.env.NVIDIA_API_KEY;
}

/**
 * Stream an assistant completion as plain text deltas.
 * Yields token strings as they arrive. Throws ProviderError on a bad HTTP status
 * and AbortError (DOMException) if the timeout fires.
 */
export async function* streamCompletion(
  messages: ChatMessage[],
  opts: StreamOptions = {},
): AsyncGenerator<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error('NVIDIA_API_KEY is not set');

  const model = opts.model ?? CHAT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 45_000);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.4,
        top_p: 0.95,
        max_tokens: opts.maxTokens ?? 1024,
        stream: true,
        // Disable extended "thinking" for chat latency. Nemotron-specific knob —
        // other families (e.g. MiniMax) reject it, so only send it for Nemotron.
        ...(model.includes('nemotron') ? { chat_template_kwargs: { enable_thinking: false } } : {}),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }

  if (!res.ok || !res.body) {
    clearTimeout(timeout);
    const body = await res.text().catch(() => '');
    throw new ProviderError(res.status, body);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // OpenAI-compatible SSE: lines of `data: {json}` separated by blank lines.
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length) yield delta;
        } catch {
          // keepalive / partial line — ignore
        }
      }
    }
  } finally {
    clearTimeout(timeout);
    reader.releaseLock();
  }
}

/**
 * Collect a full (non-streamed) completion into a single string. Thin wrapper over
 * streamCompletion — used for short one-shot generations like the chatbot greeting,
 * where streaming buys nothing. Throws the same errors as streamCompletion.
 */
export async function complete(messages: ChatMessage[], opts: StreamOptions = {}): Promise<string> {
  let full = '';
  for await (const delta of streamCompletion(messages, opts)) full += delta;
  return full.trim();
}
