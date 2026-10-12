import { NextResponse } from "next/server";
import { AiVerdict, CheckRequest, mergeResults, patternResult, type CheckResult } from "../../../lib/check";
import { userPrompt } from "../../../lib/prompt";
import { ProviderError, askAnthropic, askOpenAI, pickProvider, trimAnswer } from "../../../lib/providers";
import { redact } from "../../../lib/redact";
import { checkPatterns } from "../../../lib/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/*
 * Simple per-IP rate limit so a public demo can't run up the API bill.
 * It lives in memory, so each server instance counts separately: good enough
 * for a class demo, not a hard guarantee.
 */
const WINDOW_MS = 60_000;
const PER_WINDOW = 8;
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > PER_WINDOW;
}

export async function POST(req: Request): Promise<NextResponse> {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many checks in a minute. Wait a moment and try again." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send the message as JSON." }, { status: 400 });
  }
  const parsed = CheckRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "That message can’t be checked." }, { status: 400 });
  }

  // The browser already hides codes and account numbers; do it again here in case it didn't.
  const text = redact(parsed.data.text).text;
  const sender = redact(parsed.data.sender).text;
  const patterns = checkPatterns(text, sender);

  const provider = pickProvider();
  if (!provider) {
    return NextResponse.json(
      patternResult(text, sender, "The AI check isn’t set up on this server yet, so this result is from the pattern check only.", patterns),
    );
  }

  const ask = provider === "anthropic" ? askAnthropic : askOpenAI;
  const prompt = userPrompt(text, sender, parsed.data.channel, patterns);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const verdict = AiVerdict.safeParse(trimAnswer(await ask(prompt)));
      if (!verdict.success) {
        // Invalid shape: retry once, then fall back. Never log the message itself.
        console.warn(`check: invalid ${provider} output (attempt ${attempt})`);
        continue;
      }
      const result: CheckResult = mergeResults(verdict.data, patterns, text, sender);
      return NextResponse.json(result);
    } catch (err) {
      console.warn(`check: ${provider} call failed (status ${err instanceof ProviderError ? (err.status ?? "none") : "unknown"})`);
      break;
    }
  }

  return NextResponse.json(
    patternResult(text, sender, "The AI check is unavailable right now, so this result is from the pattern check only.", patterns),
  );
}
