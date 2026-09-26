export type WorkspaceAgent = { id: string; name: string; description: string; capabilities: string[]; model?: string };
export type WorkspaceTask = { id: string; title: string; agentName: string; status: string; createdAt: string; result?: string };
export const agentStoreKey = "friction_workspace_agents";
export const taskStoreKey = "friction_workspace_tasks";
export const sheetStoreKey = "friction_google_sheet_id";
export const uploadedRecordsStoreKey = "friction_uploaded_records";
export const uploadedFileNameStoreKey = "friction_uploaded_file_name";
export const builtInSkills = ["create_task", "create_approval", "write_audit_log"];
export const fallbackModels = [
  { id: "gpt-5.6-luna", label: "GPT-5.6 Luna · cost-efficient" },
  { id: "gpt-5.6-terra", label: "GPT-5.6 Terra · balanced" },
  { id: "gpt-5.6-sol", label: "GPT-5.6 Sol · advanced reasoning" },
  { id: "gpt-5.1", label: "GPT-5.1" },
  { id: "gpt-5", label: "GPT-5" },
  { id: "gpt-5-mini", label: "GPT-5 mini" },
  { id: "gpt-5-nano", label: "GPT-5 nano" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
];
export const googleTools = [
  "Google Sheets · Read shipment data",
  "Google Sheets · Read vendor history",
  "Google Sheets · Read delivery records",
  "Google Docs · Read operations documents",
  "Google Drive · Search operational files",
  "Gmail · Draft vendor email",
  "Gmail · Send approved email",
  "Google Calendar · Schedule follow-up",
];
export function readStored<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; }
  catch { return fallback; }
}
