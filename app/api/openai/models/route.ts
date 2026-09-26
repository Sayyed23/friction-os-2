import { NextResponse } from "next/server";

const openAiModels = ["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol", "gpt-5.1", "gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini"];
const suggestedRouterModels = [
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
];

export async function GET(request: Request) {
  const provider = new URL(request.url).searchParams.get("provider") || "openai";
  if (provider === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ models: suggestedRouterModels, source: "suggested", configured: false, error: "Add OPENROUTER_API_KEY to .env.local and restart the server to use these models." });
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!response.ok) return NextResponse.json({ models: [], source: "unavailable", configured: true, error: "OpenRouter could not list models. Check that the API key is valid and active." });
      const result = await response.json();
      const models = (result.data || []).filter((item: { id?: string }) => typeof item.id === "string" && /^(x-ai\/.*grok|google\/.*gemini|anthropic\/.*claude)/i.test(item.id)).map((item: { id: string; name?: string }) => ({ id: item.id, name: item.name || item.id }));
      return NextResponse.json({ models, source: "openrouter", configured: true, ...(!models.length ? { error: "No Grok, Gemini, or Claude models are available to this API key." } : {}) });
    } catch { return NextResponse.json({ models: [], source: "unavailable", configured: true, error: "Could not reach OpenRouter to load your account's models." }); }
  }
  if (provider !== "openai") return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ models: openAiModels.map(id => ({ id, name: id })), source: "suggested", configured: false, error: "Add OPENAI_API_KEY to .env.local and restart the server. The suggested list is not live account access." });
  try {
    const response = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) return NextResponse.json({ models: [], source: "unavailable", configured: true, error: "OpenAI could not list models. Check that the API key is valid and has project access." });
    const result = await response.json();
    const available = new Set<string>((result.data || []).map((item: { id: string }) => item.id));
    const models = openAiModels.filter(id => available.has(id));
    if (process.env.OPENAI_MODEL && available.has(process.env.OPENAI_MODEL) && !models.includes(process.env.OPENAI_MODEL)) models.unshift(process.env.OPENAI_MODEL);
    return NextResponse.json({ models: models.map(id => ({ id, name: id })), source: "project", configured: true, ...(!models.length ? { error: "No supported GPT models are available to this API key's project." } : {}) });
  } catch { return NextResponse.json({ models: [], source: "unavailable", configured: true, error: "Could not reach OpenAI to load your account's models." }); }
}
