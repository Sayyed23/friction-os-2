"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, CircleDot, FileSpreadsheet, ShieldCheck, Sparkles } from "lucide-react";

export default function Home() {
  const [loginError, setLoginError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cookieError = document.cookie.split("; ").find(part => part.startsWith("friction_google_login_error="))?.split("=").slice(1).join("=");
    if (params.has("google_error")) setLoginError(cookieError ? decodeURIComponent(cookieError) : "Google sign-in did not finish. Check the OAuth setup and try again.");
    if (params.has("google_error") || cookieError) {
      document.cookie = "friction_google_login_error=; Max-Age=0; path=/";
      history.replaceState({}, "", location.pathname);
    }
  }, []);
  return <main className="landing"><nav className="landing-nav"><Link className="brand" href="/"><span className="brand-mark">F</span> FRICTIONOS</Link><span className="nav-note"><span className="green-dot"/> Operations intelligence</span></nav><section className="hero"><div className="hero-copy"><div className="eyebrow"><Sparkles size={14}/> THE OPERATIONS AGENT PLATFORM</div><h1>Your operations data knows what happened.<br/><span>FrictionOS reasons through why and acts on what comes next.</span></h1><p>AI agents for logistics and warehouse operations that turn operational signals into evidence-backed actions.</p><a className="button google-login large" href="/api/google/login"><GoogleMark/> Continue with Google <ArrowRight size={17}/></a><div className="trust-note"><ShieldCheck size={16}/> Sign in securely. Connect work tools separately when you are ready.</div>{loginError && <p className="route-error login-error">{loginError}</p>}</div><div className="preview-card"><div className="preview-top"><div className="preview-icon"><CircleDot size={17}/></div><div><div className="eyebrow">LIVE INVESTIGATION PREVIEW</div><strong>Shree Logistics · Shipment delays</strong></div><span className="status-pill amber">Review</span></div><div className="preview-source"><FileSpreadsheet size={14}/><span>Shipment records</span><b>17 rows analyzed</b></div><div className="preview-stat"><b>14 <span>of 17</span></b><span>historical delays associated with<br/><strong>Checkpoint B</strong></span></div><div className="preview-explanation"><span className="eyebrow">EVIDENCE BASED FINDING</span><p>Checkpoint B appears in <b>82.4%</b> of delayed shipments. The agent compares this pattern with other checkpoints before recommending a follow-up.</p></div><div className="preview-bottom"><div><span className="eyebrow">CONFIDENCE</span><div className="confidence-line"><b>HIGH</b><span>87%</span></div></div><div className="preview-action"><span className="eyebrow">NEXT STEP</span><strong><Check size={14}/> Draft prepared for review</strong></div></div><div className="preview-foot"><span className="avatar">WO</span> Warehouse / Ops Agent <span className="green-dot"/></div></div></section><section className="flow-strip"><span>FROM SIGNAL TO RESOLUTION</span><div><b>DETECT</b><ArrowRight/><b>REASON</b><ArrowRight/><b>RECOMMEND</b><ArrowRight/><b>REVIEW & AUDIT</b></div></section><footer className="landing-footer">A shared reasoning core. Agents built around the people who run operations.</footer></main>;
}

function GoogleMark() { return <span className="google-login-mark" aria-hidden="true">G</span>; }
