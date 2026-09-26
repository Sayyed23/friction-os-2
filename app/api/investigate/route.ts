import { NextResponse } from "next/server";
import { shipments, vendorZShipments } from "@/lib/data";

export const runtime = "nodejs";

const openAiModels = new Set(["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol", "gpt-5.1", "gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini"]);
const WINDOW_MS = 60_000;
const MAX_PER_MINUTE_PER_IP = 3;
const MAX_ACTIVE_PER_IP = 1;
const MAX_ACTIVE_TOTAL = 10;
const requests = new Map<string, number[]>();
const activeByIp = new Map<string, number>();
let activeTotal = 0;

function clientKey(request: Request) {
  // Behind a proxy, use only the first forwarded address; otherwise all local requests share the fallback.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  const ip = clientKey(request);
  const now = Date.now();
  const recent = (requests.get(ip) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_PER_MINUTE_PER_IP || (activeByIp.get(ip) || 0) >= MAX_ACTIVE_PER_IP || activeTotal >= MAX_ACTIVE_TOTAL) {
    requests.set(ip, recent);
    return NextResponse.json({ error: "Task request limit reached. Try again in a minute." }, { status: 429, headers: { "Retry-After": "60" } });
  }
  recent.push(now);
  requests.set(ip, recent);
  activeByIp.set(ip, (activeByIp.get(ip) || 0) + 1);
  activeTotal++;

  try {
    let body: { query?: unknown; lowEvidence?: unknown; records?: unknown; model?: unknown; provider?: unknown };
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
    if (typeof body.query !== "string" || !body.query.trim() || body.query.length > 1000) {
      return NextResponse.json({ error: "Provide a task brief of up to 1,000 characters." }, { status: 400 });
    }
    const provider = body.provider === "openrouter" ? "openrouter" : body.provider === "openai" || body.provider == null ? "openai" : null;
    if (!provider) return NextResponse.json({ error: "Choose OpenAI or OpenRouter as the provider." }, { status: 400 });
    const model = typeof body.model === "string" ? body.model : process.env.OPENAI_MODEL || "gpt-5.6-luna";
    const records = Array.isArray(body.records) && body.records.length > 0 && body.records.length <= 500
      ? body.records
      : body.lowEvidence === true ? vendorZShipments : shipments;
    const instructions = "You are FrictionOS, an operations analyst. Use only the supplied records. Distinguish correlation from cause, state when evidence is insufficient, and suggest one practical next step. Keep the answer under 100 words.";
    const taskInput = JSON.stringify({ task: body.query.trim(), shipmentRecords: records });

    if (provider === "openrouter") {
      if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: "OpenRouter is not configured. Add OPENROUTER_API_KEY to .env.local and restart the server." }, { status: 503 });
      if (!/^(x-ai\/.*grok|google\/.*gemini|anthropic\/.*claude)$/i.test(model)) return NextResponse.json({ error: "Choose a Grok, Gemini, or Claude model from OpenRouter." }, { status: 400 });
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": process.env.APP_URL || "http://localhost:3000", "X-Title": "FrictionOS" },
        body: JSON.stringify({ model, max_tokens: 300, messages: [{ role: "system", content: instructions }, { role: "user", content: taskInput }] }),
        signal: AbortSignal.timeout(30_000),
      });
      const result = await response.json();
      if (!response.ok) return NextResponse.json({ error: result?.error?.message || `OpenRouter request failed (${response.status}).` }, { status: response.status === 429 ? 429 : 502 });
      const content = result?.choices?.[0]?.message?.content;
      const text = typeof content === "string" ? content.trim() : Array.isArray(content) ? content.map((part: { text?: string }) => part.text || "").join("\n").trim() : "";
      if (!text) return NextResponse.json({ error: "OpenRouter returned an empty response." }, { status: 502 });
      return NextResponse.json({ analysis: text, provider, model, sourceRows: Array.isArray(body.records) ? records.length : null });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OpenAI is not configured. Add OPENAI_API_KEY to .env.local and restart the dev server." }, { status: 503 });
    if (!openAiModels.has(model) && model !== process.env.OPENAI_MODEL) return NextResponse.json({ error: "Choose a supported OpenAI model." }, { status: 400 });
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, max_output_tokens: 300, instructions, input: taskInput }), signal: AbortSignal.timeout(30_000),
    });
    const result = await response.json();
    if (!response.ok) return NextResponse.json({ error: result?.error?.message || `OpenAI request failed (${response.status}).` }, { status: response.status === 429 ? 429 : 502 });
    const text = Array.isArray(result.output) ? result.output.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => Array.isArray(item.content) ? item.content.filter((part) => part.type === "output_text").map((part) => part.text || "") : []).join("\n").trim() : "";
    if (!text) return NextResponse.json({ error: "OpenAI returned an empty response." }, { status: 502 });
    return NextResponse.json({ analysis: text, provider, model, sourceRows: Array.isArray(body.records) ? records.length : null });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") return NextResponse.json({ error: "Model request timed out. Try again." }, { status: 504 });
    return NextResponse.json({ error: "Could not reach the model API. Check your connection and try again." }, { status: 502 });
  } finally {
    activeByIp.set(ip, Math.max(0, (activeByIp.get(ip) || 1) - 1));
    if (!activeByIp.get(ip)) activeByIp.delete(ip);
    activeTotal = Math.max(0, activeTotal - 1);
    for (const [key, timestamps] of requests) if (timestamps.every((timestamp) => Date.now() - timestamp >= WINDOW_MS)) requests.delete(key);
  }
}
