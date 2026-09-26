export type WorkspaceAgent = { id: string; name: string; description: string; capabilities: string[] };
export type WorkspaceTask = { id: string; title: string; agentName: string; status: string; createdAt: string; result?: string };
export const agentStoreKey = "friction_workspace_agents";
export const taskStoreKey = "friction_workspace_tasks";
export const sheetStoreKey = "friction_google_sheet_id";
export const builtInSkills = ["create_task", "create_approval", "write_audit_log"];
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
