import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const sheetId = new URL(request.url).searchParams.get("spreadsheetId")?.trim();
  if (!sheetId || !/^[a-zA-Z0-9_-]{20,}$/.test(sheetId)) {
    return NextResponse.json({ error: "Enter a valid Google Sheets spreadsheet ID in Tools." }, { status: 400 });
  }
  const cookieStore = await cookies();
  const rawConnection = cookieStore.get("friction_google_connection")?.value;
  if (!rawConnection) return NextResponse.json({ error: "Connect Google in Tools to read shipment data." }, { status: 401 });

  try {
    const connection = JSON.parse(rawConnection) as { accessToken: string; refreshToken?: string; expiresAt: number; services?: string[] };
    if (!connection.services?.includes("sheets")) return NextResponse.json({ error: "Grant Google Sheets access to this app and agent first." }, { status: 403 });
    let accessToken = connection.accessToken;
    if (connection.expiresAt < Date.now() + 60_000 && connection.refreshToken) {
      const refresh = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          refresh_token: connection.refreshToken,
          grant_type: "refresh_token",
        }),
      });
      const refreshed = await refresh.json();
      if (!refresh.ok || !refreshed.access_token) throw new Error("Google access expired. Reconnect Google in Tools.");
      accessToken = refreshed.access_token;
    }

    const sheetsResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/A:Z`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const sheetData = await sheetsResponse.json();
    if (!sheetsResponse.ok) {
      const message = sheetsResponse.status === 403
        ? "Google could not read this sheet. Share it with the connected account and check the Sheets API is enabled."
        : sheetsResponse.status === 404 ? "Spreadsheet not found. Check the spreadsheet ID in Tools." : "Could not read this Google Sheet.";
      return NextResponse.json({ error: message }, { status: sheetsResponse.status === 403 ? 403 : 502 });
    }
    const rows: string[][] = Array.isArray(sheetData.values) ? sheetData.values : [];
    const [headers = [], ...values] = rows;
    const records = values.slice(0, 500).map((row) => Object.fromEntries(headers.map((header: string, index: number) => [header, row[index] ?? ""])));
    return NextResponse.json({ records, rowCount: records.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read Google Sheets." }, { status: 502 });
  }
}
