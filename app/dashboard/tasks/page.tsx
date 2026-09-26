"use client";

import { FormEvent, useEffect, useState } from "react";
import { Activity, ArrowRight, Clock3, FileText, LoaderCircle, Plus, Upload, X } from "lucide-react";
import { WorkspaceFrame } from "../_components/workspace-frame";
import { WorkspaceAgent, WorkspaceTask, agentStoreKey, taskStoreKey, sheetStoreKey, uploadedRecordsStoreKey, readStored } from "../_components/workspace-state";

type Provider = "openai" | "openrouter";
type ModelOption = { id: string; name: string };
const defaultAgent: WorkspaceAgent = { id: "warehouse_ops", name: "Warehouse / Ops Agent", description: "Investigates shipment delays and coordinates operational follow-through.", capabilities: ["Investigate shipment delays", "Analyze historical shipments"], model: "gpt-5.6-luna" };

export default function TasksPage() {
  const [agents, setAgents] = useState<WorkspaceAgent[]>([defaultAgent]);
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [agentId, setAgentId] = useState(defaultAgent.id);
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState<Provider>("openai");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);
  const [modelLoadError, setModelLoadError] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    const savedAgents = readStored<WorkspaceAgent[]>(agentStoreKey, []);
    const list = [defaultAgent, ...savedAgents];
    setAgents(list);
    setAgentId(list[0].id);
    setTasks(readStored<WorkspaceTask[]>(taskStoreKey, []));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/openai/models?provider=${provider}`).then(response => response.json()).then(data => {
      if (cancelled) return;
      const options: ModelOption[] = Array.isArray(data.models) ? data.models.map((item: string | ModelOption) => typeof item === "string" ? { id: item, name: item } : item) : [];
      setModels(options);
      setProviderConfigured(data.configured ?? null);
      setModelLoadError(typeof data.error === "string" ? data.error : "");
      setModel(current => options.some(option => option.id === current) ? current : options[0]?.id || "");
    }).catch(() => { if (!cancelled) { setModels([]); setModel(""); setModelLoadError("Could not load the model catalog. Check your connection and restart the server."); } });
    return () => { cancelled = true; };
  }, [provider]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const assigned = agents.find(agent => agent.id === agentId) || defaultAgent;
    const task: WorkspaceTask = { id: `task_${Date.now()}`, title: title.trim(), agentName: assigned.name, status: "Investigating", createdAt: new Date().toLocaleString(), attachments: files.map(file => file.name) };
    const started = [task, ...tasks];
    setTasks(started);
    localStorage.setItem(taskStoreKey, JSON.stringify(started));
    setTitle(""); setBusy(true); setError("");
    try {
      let records: unknown[] | undefined;
      if (assigned.capabilities.some(cap => cap.startsWith("Google Sheets"))) {
        const uploaded = localStorage.getItem(uploadedRecordsStoreKey);
        if (uploaded) records = JSON.parse(uploaded) as unknown[];
        else {
          const sheetId = localStorage.getItem(sheetStoreKey) || "";
          const sheetResponse = await fetch(`/api/google/sheets?spreadsheetId=${encodeURIComponent(sheetId)}`);
          const sheet = await sheetResponse.json();
          if (!sheetResponse.ok) throw new Error(sheet.error || "Could not read Google Sheets.");
          records = sheet.records;
        }
      }
      const payload = new FormData();
      payload.set("query", task.title); payload.set("provider", provider); payload.set("model", model);
      if (records) payload.set("records", JSON.stringify(records));
      files.forEach(file => payload.append("attachments", file));
      const response = await fetch("/api/investigate", { method: "POST", body: payload });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Investigation failed.");
      const completed = { ...task, status: "Completed", result: `${result.provider === "openrouter" ? "OpenRouter" : "OpenAI"} · ${result.model}: ${result.analysis}` };
      const updated = [completed, ...tasks]; setTasks(updated); localStorage.setItem(taskStoreKey, JSON.stringify(updated));
    } catch (err) {
      const failed = { ...task, status: "Needs attention" };
      const updated = [failed, ...tasks]; setTasks(updated); localStorage.setItem(taskStoreKey, JSON.stringify(updated));
      setError(err instanceof Error ? err.message : "Task failed.");
    } finally { setBusy(false); setFiles([]); }
  }

  return <WorkspaceFrame title="Tasks" subtitle="Choose a provider and model for each task, then review the investigation and result."><div className="route-grid">
    <section className="route-panel"><div className="route-panel-heading"><div><span className="section-label">NEW TASK</span><h2>Start an investigation</h2></div><Plus size={18}/></div>
      <form className="route-form" onSubmit={submit}>
        <label className="field-label">Assign to<select value={agentId} onChange={e => setAgentId(e.target.value)}>{agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>
        <div className="task-persona-strip"><span className="agent-avatar"><Activity size={14}/></span><div><b>{agents.find(agent => agent.id === agentId)?.name}</b><small>{agents.find(agent => agent.id === agentId)?.capabilities.some(cap => cap.startsWith("Google Sheets")) ? "Reads the selected Google Sheet before analyzing." : "Uses the connected reasoning workflow for this task."}</small></div></div>
        <label className="field-label">Model provider<select value={provider} onChange={e => setProvider(e.target.value as Provider)}><option value="openrouter">OpenRouter · Grok, Gemini, Claude</option><option value="openai">OpenAI</option></select></label>
        <label className="field-label">Model<select required value={model} onChange={e => setModel(e.target.value)} disabled={!models.length}><option value="" disabled>{models.length ? "Select a model" : "No available models"}</option>{models.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>{modelLoadError && <small className="model-help">{modelLoadError}</small>}{providerConfigured === false && <small className="model-help">Add {provider === "openai" ? "OPENAI_API_KEY" : "OPENROUTER_API_KEY"} to .env.local and restart the server. The suggested list is for reference; tasks cannot run without the key.</small>}</label>
        <div className="rate-limit-note">Strict limits: 3 task requests/minute per IP, 1 active request per IP, 1,800 output tokens. Results can take up to 60 seconds.</div>
        <label className="field-label">Task brief<textarea required rows={5} value={title} onChange={e => setTitle(e.target.value)} placeholder="Example: Find the recurring delay pattern in this week's shipments."/></label>
        <div className="field-label">Evidence files <small className="model-help">PDF, Excel (.xls/.xlsx), or CSV · up to 3 files · 10 MB each</small>
          <label className="attachment-picker"><Upload size={15}/> Attach from device<input type="file" accept=".pdf,.xls,.xlsx,.csv,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple onChange={e => { const next = Array.from(e.target.files || []); setFiles(current => [...current, ...next].slice(0, 3)); e.currentTarget.value = ""; }}/></label>
          {files.map((file, index) => <div className="attached-file" key={`${file.name}-${index}`}><FileText size={14}/><span>{file.name}</span><small>{(file.size / 1024 / 1024).toFixed(1)} MB</small><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(current => current.filter((_, i) => i !== index))}><X size={14}/></button></div>)}
        </div>
        <button className="button primary" disabled={busy || !title.trim() || !model} type="submit">{busy ? <LoaderCircle size={15} className="spin-icon"/> : <Plus size={15}/>} {busy ? "Running investigation" : "Create task"}<ArrowRight size={14}/></button>{error && <p className="route-error">{error}</p>}
      </form>
    </section>
    <section className="route-panel"><div className="route-panel-heading"><div><span className="section-label">TASK HISTORY</span><h2>{tasks.length} tasks</h2></div></div>{tasks.length ? tasks.map(task => <article className="task-row-card" key={task.id}><span className={`task-status-dot ${task.status === "Completed" ? "done" : "pending"}`}/><div><div className="task-row-title"><b>{task.title}</b><span>{task.status}</span></div><p>{task.agentName} <i>·</i> {task.createdAt}</p>{task.attachments?.length ? <p className="task-attachments"><FileText size={12}/> Evidence: {task.attachments.join(", ")}</p> : null}{task.result && <blockquote>{task.result}</blockquote>}</div></article>) : <div className="route-empty"><Clock3 size={22}/><b>No tasks yet</b><span>Create a task to see its investigation and status here.</span></div>}</section>
  </div></WorkspaceFrame>;
}
