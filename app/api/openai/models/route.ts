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
    if (!apiKey) return NextResponse.json({ models: suggestedRouterModels, source: "suggested", configured: false });
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store", signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (!response.ok) return NextResponse.json({ models: suggestedRouterModels, source: "suggested", configured: true });
      const models = (result.data || []).filter((model: { id?: string; name?: string }) =>
        typeof model.id === "string" && /^(x-ai\/.*grok|google\/.*gemini|anthropic\/.*claude)/i.test(model.id),
      ).map((model: { id: string; name?: string }) => ({ id: model.id, name: model.name || model.id }));
      return NextResponse.json({ models: models.length ? models : suggestedRouterModels, source: models.length ? "openrouter" : "suggested", configured: true });
    } catch {
      return NextResponse.json({ models: suggestedRouterModels, source: "suggested", configured: true });
    }
  }
  if (provider !== "openai") return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ models: openAiModels, source: "suggested", configured: false });
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    if (!response.ok) return NextResponse.json({ models: openAiModels, source: "suggested", configured: true });
    const available = new Set<string>((result.data || []).map((model: { id: string }) => model.id));
    const models = openAiModels.filter((model) => available.has(model));
    if (process.env.OPENAI_MODEL && available.has(process.env.OPENAI_MODEL) && !models.includes(process.env.OPENAI_MODEL)) models.unshift(process.env.OPENAI_MODEL);
    return NextResponse.json({ models: (models.length ? models : openAiModels).map(id => ({ id, name: id })), source: models.length ? "project" : "suggested", configured: true });
  } catch {
    return NextResponse.json({ models: openAiModels.map(id => ({ id, name: id })), source: "suggested", configured: true });
  }
}
