import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, VERDICT_TOOL, strictSchema } from "./prompt";

/*
 * Server-only. Asks one AI provider for a verdict and returns its raw answer
 * (validated by the caller). Which provider runs depends on the keys set:
 *   AI_PROVIDER=anthropic|openai forces one; otherwise Anthropic if
 *   ANTHROPIC_API_KEY is set, else OpenAI if OPENAI_API_KEY is set.
 */

export type Provider = "anthropic" | "openai";

export function pickProvider(env: Record<string, string | undefined> = process.env): Provider | null {
  const forced = env.AI_PROVIDER?.toLowerCase();
  if (forced === "anthropic" && env.ANTHROPIC_API_KEY) return "anthropic";
  if (forced === "openai" && env.OPENAI_API_KEY) return "openai";
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  if (env.OPENAI_API_KEY) return "openai";
  return null;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 25_000;

export async function askAnthropic(userText: string): Promise<unknown> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: TIMEOUT_MS, maxRetries: 1 });
  try {
    const res = await client.messages.create({
      model: process.env.CHECK_MODEL || "claude-sonnet-5-5",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      tools: [VERDICT_TOOL],
      tool_choice: { type: "tool", name: VERDICT_TOOL.name },
      messages: [{ role: "user", content: userText }],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    return block && "input" in block ? block.input : null;
  } catch (err) {
    throw new ProviderError("anthropic request failed", err instanceof Anthropic.APIError ? err.status : undefined);
  }
}

/** OpenAI Chat Completions with strict JSON schema output, called with fetch (no extra package). */
export async function askOpenAI(userText: string): Promise<unknown> {
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userText },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: VERDICT_TOOL.name, strict: true, schema: strictSchema() },
        },
      }),
    });
    if (!res.ok) throw new ProviderError("openai request failed", res.status);
    const data = (await res.json()) as { choices?: { message?: { content?: string | null; refusal?: string | null } }[] };
    const content = data.choices?.[0]?.message?.content;
    return content ? JSON.parse(content) : null;
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    throw new ProviderError(err instanceof Error && err.name === "AbortError" ? "openai timed out" : "openai request failed");
  } finally {
    clearTimeout(timer);
  }
}

/** Trims arrays to the limits the app shows, so a long answer isn't rejected. */
export function trimAnswer(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const r = { ...(raw as Record<string, unknown>) };
  const cut = (k: string, n: number) => {
    if (Array.isArray(r[k])) r[k] = (r[k] as unknown[]).slice(0, n);
  };
  cut("red_flags", 8);
  cut("safe_signs", 6);
  cut("what_to_do", 5);
  return r;
}
