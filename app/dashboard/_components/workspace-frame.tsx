"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CheckCircle2, ChevronRight, LayoutDashboard, PlugZap, Settings, UserRoundCog, Users } from "lucide-react";

const sections = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/tasks", label: "Tasks", icon: Activity },
  { href: "/dashboard/agents", label: "Agents", icon: Users },
  { href: "/dashboard/actions", label: "Actions & approvals", icon: CheckCircle2 },
  { href: "/dashboard/tools", label: "Tools", icon: PlugZap },
];

export function WorkspaceFrame({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  const pathname = usePathname();
  return <div className="app-shell"><aside className="sidebar"><div className="side-brand"><Link className="brand" href="/"><span className="brand-mark">F</span> FRICTIONOS</Link><div className="workspace-switch"><span className="workspace-avatar">N</span><span><b>Northstar Logistics</b><small>Operations workspace</small></span><ChevronRight size={14}/></div></div><div className="side-nav-label">WORKSPACE</div><nav className="side-nav">{sections.map(({href,label,icon:Icon})=><Link key={href} href={href} className={pathname===href?"active":""}><Icon size={17}/>{label}</Link>)}</nav><div className="side-nav-label agent-nav-label">YOUR AGENTS</div><Link className="agent-nav-row selected" href="/dashboard/agents"><span className="mini-agent-icon"><UserRoundCog size={15}/></span><span>Warehouse / Ops</span><span className="green-dot"/></Link><div className="sidebar-spacer"/><Link className="settings-link" href="/dashboard/tools"><Settings size={16}/>Settings & tools</Link><div className="user-profile"><span className="user-avatar">AM</span><span><b>Alex Morgan</b><small>Operations Manager</small></span></div></aside><main className="main-area"><header className="topbar"><div className="breadcrumbs">Workspace <ChevronRight size={14}/><b>{title}</b></div><div className="topbar-right"><span className="live-status"><span className="green-dot"/> All systems operational</span><span className="top-avatar">AM</span></div></header><div className="dashboard-content route-content"><div className="page-heading"><div><div className="eyebrow">OPERATIONS WORKSPACE</div><h1>{title}</h1><p>{subtitle}</p></div></div>{children}</div></main></div>;
}

export function RouteCard({ label, title, description, href, action }: { label: string; title: string; description: string; href: string; action: string }) {
  return <Link href={href} className="route-card"><span className="section-label">{label}</span><h2>{title}</h2><p>{description}</p><span className="route-card-action">{action} <ChevronRight size={14}/></span></Link>;
}
