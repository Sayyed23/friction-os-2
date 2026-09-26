import { NextResponse } from "next/server";
import { shipments, vendorZShipments } from "@/lib/data";

export const runtime = "nodejs";

const allowedModels = new Set(["gpt-5.6-luna", "gpt-5.6-terra"]);

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI is not configured. Add OPENAI_API_KEY to .env.local and restart the dev server." },
      { status: 503 },
    );
  }

  let body: { query?: unknown; lowEvidence?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body.query !== "string" || !body.query.trim() || body.query.length > 1000) {
    return NextResponse.json({ error: "Provide a task brief of up to 1,000 characters." }, { status: 400 });
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
  if (!allowedModels.has(model)) {
    return NextResponse.json({ error: "OPENAI_MODEL must be gpt-5.6-luna or gpt-5.6-terra." }, { status: 500 });
  }
  const records = body.lowEvidence === true ? vendorZShipments : shipments;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_output_tokens: 300,
        instructions: "You are FrictionOS, an operations analyst. Use only the supplied records. Distinguish correlation from cause, state when evidence is insufficient, and suggest one practical next step. Keep the answer under 100 words.",
        input: JSON.stringify({ task: body.query.trim(), shipmentRecords: records }),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      const message = result?.error?.message || `OpenAI request failed (${response.status}).`;
      return NextResponse.json({ error: message }, { status: response.status === 429 ? 429 : 502 });
    }
    const text = Array.isArray(result.output)
      ? result.output.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) =>
          Array.isArray(item.content)
            ? item.content.filter((part) => part.type === "output_text").map((part) => part.text || "")
            : [],
        ).join("\n").trim()
      : "";
    if (!text) return NextResponse.json({ error: "OpenAI returned an empty response." }, { status: 502 });
    return NextResponse.json({ analysis: text, model });
  } catch {
    return NextResponse.json({ error: "Could not reach the OpenAI API. Check your connection and try again." }, { status: 502 });
  }
}
