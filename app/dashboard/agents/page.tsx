"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Check, Clock3, Plus, UserRoundCog } from "lucide-react";
import { WorkspaceAgent, agentStoreKey, builtInSkills, googleTools, readStored, fallbackModels } from "../_components/workspace-state";
import { WorkspaceFrame } from "../_components/workspace-frame";

const baseCapabilities = ["Investigate shipment delays", "Analyze historical shipments", "Identify recurring patterns", "Draft vendor communications"];
const financeToolGroups = [
  { provider: "Google", status: "Available when connected", tools: ["Gmail · Finance notifications and vendor follow-ups", "Sheets · Invoice, bill, transaction and reconciliation data", "Drive · Receipts, contracts and accounting documents"] },
  { provider: "Xero Demo Company", status: "Adding soon", tools: ["Invoices", "Bills", "Transactions", "Accounting data"] },
  { provider: "Slack Free", status: "Adding soon", tools: ["Finance notifications", "Approval requests", "Agent alerts"] },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<WorkspaceAgent[]>([]);
  const [name, setName] = useState("Warehouse / Ops Agent");
  const [description, setDescription] = useState("Investigate shipment delays and coordinate operational follow-through.");
  const [selected, setSelected] = useState<string[]>(baseCapabilities);
  const [googleServices, setGoogleServices] = useState<string[]>([]);
  const [models, setModels] = useState(fallbackModels);
  const [model, setModel] = useState("gpt-5.6-luna");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAgents(readStored(agentStoreKey, []));
    fetch("/api/google/status").then(r => r.json()).then(data => setGoogleServices(data.services || [])).catch(() => {});
    fetch("/api/openai/models").then(r => r.json()).then(data => {
      if (!data.models?.length) return;
      const options = data.models.map((item: string | { id: string; name: string }) => {
        const id = typeof item === "string" ? item : item.id;
        return fallbackModels.find(option => option.id === id) || { id, label: typeof item === "string" ? id : item.name };
      });
      setModels(options);
      if (!options.some((option: { id: string }) => option.id === model)) setModel(options[0].id);
    }).catch(() => {});
  }, []);

  function createAgent(event: FormEvent) {
    event.preventDefault();
    const agent = { id: `agent_${Date.now()}`, name: name.trim(), description: description.trim(), capabilities: [...selected, ...builtInSkills], model };
    const next = [...agents, agent]; setAgents(next); localStorage.setItem(agentStoreKey, JSON.stringify(next)); setSaved(true);
  }

  const availableGoogle = googleTools.filter(tool => {
    const service = tool.startsWith("Google Sheets") ? "sheets" : tool.startsWith("Google Docs") ? "docs" : tool.startsWith("Google Drive") ? "drive" : tool.startsWith("Gmail") ? "gmail" : "calendar";
    return googleServices.includes(service);
  });

  return <WorkspaceFrame title="Agents" subtitle="Create focused agents, choose their model, and grant each only the tools it needs."><div className="route-grid">
    <section className="route-panel"><div className="route-panel-heading"><div><span className="section-label">NEW AGENT</span><h2>Define an agent</h2></div><UserRoundCog size={19}/></div>
      <form className="route-form" onSubmit={createAgent}><label className="field-label">Agent name<input required value={name} onChange={e => setName(e.target.value)}/></label><label className="field-label">Purpose<textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}/></label>
        <label className="field-label">OpenAI model<select value={model} onChange={e => setModel(e.target.value)}>{models.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select><small className="model-help">Choose the model this agent uses by default. Tasks can override it when run.</small></label>
        <div className="route-subhead">Operational capabilities</div>{baseCapabilities.concat("Send permitted communications").map(cap => <label className="route-check" key={cap}><span><b>{cap}</b><small>Keep this capability inside the agent's task scope.</small></span><input type="checkbox" checked={selected.includes(cap)} onChange={e => setSelected(e.target.checked ? [...selected, cap] : selected.filter(x => x !== cap))}/></label>)}
        <div className="route-subhead">Google service tools</div>{googleTools.map(cap => <label className={`route-check ${!availableGoogle.includes(cap) ? "disabled" : ""}`} key={cap}><span><b>{cap}</b><small>{availableGoogle.includes(cap) ? "Granted by Google and available to assign." : "Connect this service in Tools to enable it."}</small></span><input type="checkbox" disabled={!availableGoogle.includes(cap)} checked={selected.includes(cap)} onChange={e => setSelected(e.target.checked ? [...selected, cap] : selected.filter(x => x !== cap))}/></label>)}
        <div className="route-subhead">Built-in FrictionOS skills</div><div className="skill-chips">{builtInSkills.map(skill => <span key={skill}><Check size={12}/>{skill}</span>)}</div><button className="button primary" type="submit"><Plus size={15}/> Create agent</button>{saved && <p className="route-success">Agent saved. It is ready to receive tasks.</p>}
      </form>
    </section>
    <section className="route-panel"><div className="route-panel-heading"><div><span className="section-label">WORKSPACE AGENTS</span><h2>{agents.length} custom agents</h2></div></div>{agents.length ? agents.map(agent => <article className="agent-row-card" key={agent.id}><span className="agent-avatar"><UserRoundCog size={15}/></span><div><b>{agent.name}</b><p>{agent.description}</p><small>{agent.capabilities.length} capabilities · {agent.model || "gpt-5.6-luna"}</small></div></article>) : <div className="route-empty"><UserRoundCog size={22}/><b>No custom agents yet</b><span>Create an agent to assign it a task.</span></div>}
      <article className="finance-preview-card" id="finance-preview"><div className="finance-preview-heading"><span className="agent-avatar"><UserRoundCog size={15}/></span><div><span className="section-label">AGENT PREVIEW</span><h3>Finance / Compliance Agent</h3></div><span className="status-pill amber"><Clock3 size={11}/> PREVIEW</span></div><p className="route-copy">A finance-focused agent for reconciliation, invoice checks, policy review and approval routing.</p>{financeToolGroups.map(group => <div className="finance-tool-group" key={group.provider}><div><b>{group.provider}</b><small className={group.status === "Adding soon" ? "coming-soon" : "available-soon"}>{group.status}</small></div><ul>{group.tools.map(tool => <li key={tool}>{tool}</li>)}</ul></div>)}<button className="button secondary" type="button" disabled><Clock3 size={14}/> Finance agent setup · Adding soon</button></article>
      <a className="route-inline-link" href="/dashboard/tools">Manage connected tools <ArrowRight size={14}/></a>
    </section>
  </div></WorkspaceFrame>;
}
