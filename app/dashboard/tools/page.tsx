"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Calendar, Check, FileStack, HardDrive, Mail, PlugZap, ShieldCheck, Table2, Upload } from "lucide-react";
import { WorkspaceFrame } from "../_components/workspace-frame";
import { builtInSkills, sheetStoreKey, uploadedFileNameStoreKey, uploadedRecordsStoreKey } from "../_components/workspace-state";

const services = [
  { id: "sheets", name: "Google Sheets", description: "Read shipment, vendor and delivery records", icon: Table2 },
  { id: "docs", name: "Google Docs", description: "Read operations documents", icon: FileStack },
  { id: "drive", name: "Google Drive", description: "Open selected operational files", icon: HardDrive },
  { id: "gmail", name: "Gmail", description: "Draft and send vendor email", icon: Mail },
  { id: "calendar", name: "Google Calendar", description: "Schedule vendor follow-ups", icon: Calendar },
];

function parseDelimited(text: string, delimiter: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && char === delimiter) { row.push(cell); cell = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const nonEmpty = rows.filter(values => values.some(value => value.trim()));
  if (nonEmpty.length < 2) throw new Error("The file needs a header row and at least one data row.");
  const headers = nonEmpty[0].map((value, index) => value.trim() || `column_${index + 1}`);
  return nonEmpty.slice(1, 501).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ""])));
}

export default function ToolsPage() {
  const [connected, setConnected] = useState(false);
  const [granted, setGranted] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>(["sheets"]);
  const [sheetId, setSheetId] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSheetId(localStorage.getItem(sheetStoreKey) || "");
    setUploadName(localStorage.getItem(uploadedFileNameStoreKey) || "");
    fetch("/api/google/status").then(r => r.json()).then(data => { setConnected(Boolean(data.connected)); setGranted(data.services || []); if (data.services?.length) setSelected(data.services); }).catch(() => {});
    const query = new URLSearchParams(location.search);
    if (query.has("google_error")) {
      setNotice(query.get("google_error") === "missing_config" ? "Add Google OAuth and Picker settings to .env.local, then restart the app." : "Google connection did not finish. Check the OAuth client setup and try again.");
      history.replaceState({}, "", location.pathname);
    }
  }, []);

  function saveSheet(id: string) {
    setSheetId(id); setUploadName("");
    localStorage.setItem(sheetStoreKey, id);
    localStorage.removeItem(uploadedRecordsStoreKey); localStorage.removeItem(uploadedFileNameStoreKey);
  }

  async function chooseSheet() {
    try {
      if (!process.env.NEXT_PUBLIC_GOOGLE_API_KEY || !process.env.NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER) throw new Error("Add the Google Picker API key and project number to .env.local.");
      const tokenResponse = await fetch("/api/google/picker-token"); const token = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(token.error);
      const pickerWindow = window as unknown as { gapi?: { load: (name: string, callback: () => void) => void }; google?: any };
      if (!pickerWindow.gapi) await new Promise<void>((resolve, reject) => { const script = document.createElement("script"); script.src = "https://apis.google.com/js/api.js"; script.onload = () => resolve(); script.onerror = () => reject(new Error("Could not load Google Picker.")); document.head.appendChild(script); });
      pickerWindow.gapi!.load("picker", () => {
        const picker = pickerWindow.google!.picker;
        const view = new picker.DocsView(picker.ViewId.SPREADSHEETS).setMimeTypes("application/vnd.google-apps.spreadsheet");
        new picker.PickerBuilder().addView(view).setOAuthToken(token.accessToken).setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY).setAppId(process.env.NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER).setCallback((data: { action: string; docs?: Array<{ id: string }> }) => { if (data.action === picker.Action.PICKED && data.docs?.[0]?.id) saveSheet(data.docs[0].id); }).build().setVisible(true);
      });
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not open Google Picker."); }
  }

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setNotice("");
    if (file.size > 1_000_000) { setNotice("Upload a file under 1 MB. CSV, TSV, or JSON files are supported."); return; }
    const extension = file.name.split(".").pop()?.toLowerCase();
    try {
      const content = await file.text();
      let records: Record<string, unknown>[];
      if (extension === "json") {
        const parsed: unknown = JSON.parse(content);
        if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(item => item && typeof item === "object" && !Array.isArray(item))) throw new Error("JSON files must contain an array of row objects.");
        records = parsed.slice(0, 500) as Record<string, unknown>[];
      } else if (extension === "csv" || extension === "tsv") {
        records = parseDelimited(content, extension === "tsv" ? "\t" : ",");
      } else throw new Error("Choose a CSV, TSV, or JSON file.");
      localStorage.setItem(uploadedRecordsStoreKey, JSON.stringify(records));
      localStorage.setItem(uploadedFileNameStoreKey, file.name);
      localStorage.removeItem(sheetStoreKey);
      setSheetId(""); setUploadName(file.name);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not read this file."); }
  }

  async function disconnect() { await fetch("/api/google/status", { method: "DELETE" }); setConnected(false); setGranted([]); setSelected(["sheets"]); }

  return <WorkspaceFrame title="Tools" subtitle="Connect providers and keep permissions limited to the services your agents use."><div className="route-grid">
    <section className="route-panel"><div className="route-panel-heading"><div><span className="section-label">PROVIDER</span><h2><span className="google-mark">G</span> Google</h2></div><span className={`status-pill ${connected ? "green" : "amber"}`}>{connected ? "CONNECTED" : "NOT CONNECTED"}</span></div><p className="route-copy">Select services before connecting. Google asks you to approve only the selected access scopes.</p>
      {services.map(service => { const Icon = service.icon; return <label className="service-row" key={service.id}><span className="service-icon"><Icon size={16}/></span><span><b>{service.name}</b><small>{service.description}{granted.includes(service.id) ? " · access granted" : ""}</small></span><input type="checkbox" checked={selected.includes(service.id)} onChange={e => setSelected(e.target.checked ? [...selected, service.id] : selected.filter(x => x !== service.id))}/></label>; })}
      <div className="provider-actions"><a className="button primary" href={`/api/google/connect?services=${selected.join(",")}`}>{connected ? "Update Google access" : "Connect selected services"}</a>{connected && <button className="button secondary" onClick={disconnect}>Disconnect</button>}</div>{notice && <p className="route-error">{notice}</p>}<div className="route-note"><ShieldCheck size={15}/> Google Sheets uses per-file access. Select the spreadsheet below to authorize it.</div>
    </section>
    <section className="route-panel"><div className="route-panel-heading"><div><span className="section-label">DATA SOURCE</span><h2>Shipment spreadsheet</h2></div></div><p className="route-copy">Use a Google Sheet or upload a spreadsheet file. Agents with a Google Sheets capability use the selected data when they run a task.</p>
      <label className="field-label">Selected file<input readOnly value={uploadName || sheetId} placeholder="No spreadsheet selected"/></label>
      {uploadName && <p className="route-success">Local file ready · up to 500 rows will be used for task analysis.</p>}
      <div className="provider-actions"><button className="button secondary" onClick={chooseSheet} disabled={!connected || !granted.includes("sheets")}>Choose Google Sheet</button><span className="route-copy">or</span><button className="button secondary" onClick={() => fileInput.current?.click()}><Upload size={14}/> Upload from device</button><input ref={fileInput} type="file" accept=".csv,.tsv,.json,text/csv,text/tab-separated-values,application/json" hidden onChange={uploadFile}/></div>
      <small className="model-help">Supported: CSV, TSV, or JSON under 1 MB. Spreadsheet first row must contain column headers.</small>
      <div className="route-note">Your upload stays in this browser and is sent with task requests to the selected model provider. Choosing a Google Sheet replaces the uploaded file, and uploading a file replaces the Google Sheet selection.</div>
    </section>
    <section className="route-panel"><div className="route-panel-heading"><div><span className="section-label">FRICTIONOS SKILLS</span><h2>Built-in tools</h2></div></div>{builtInSkills.map(skill => <div className="skill-row" key={skill}><span><Check size={13}/></span><div><b>{skill}</b><small>Available to every agent and included in the task audit trail.</small></div></div>)}</section>
  </div></WorkspaceFrame>;
}
