# FrictionOS

FrictionOS is an AI-native operations workspace that helps teams resolve recurring friction in logistics and finance workflows. It uses task-driven AI, selected data, and configurable workflows to surface patterns, explain evidence, and prepare next steps for human review.

---

## 🚀 Quick Start

1. Install dependencies and create `.env.local`:

```bash
npm install
cp .env.example .env.local
```

2. Add your API keys to `.env.local`:

```bash
OPENAI_API_KEY="your-key"
OPENROUTER_API_KEY="your-key"
GOOGLE_CLIENT_ID="your-id"
GOOGLE_CLIENT_SECRET="your-secret"
NEXT_PUBLIC_GOOGLE_API_KEY="your-key"
NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER="your-number"
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎯 What It Does

FrictionOS helps operations teams quickly resolve issues like late deliveries by:

- **Task-driven AI:** Select an agent, add a brief, and choose an LLM for that task.
- **Configurable data:** Connect Google Sheets or upload local CSV/TSV/JSON files.
- **Evidence-based analysis:** The AI analyzes only the provided shipment records, identifies patterns, and suggests a single next step.
- **Human review:** Review and approve decisions in the Actions & approvals area before they’re finalized.

## 📋 Requirements

- Node.js 20+
- npm
- OpenAI API key (optional, used for the default OpenAI model)
- OpenRouter API key (optional, used for Grok/Gemini/Claude models)
- Google OAuth web app credentials (for Google sign-in and Sheets access)
- Google Picker API key (optional, if using Google Sheets Picker)

## The problem

Warehouse and operations teams often have shipment events, vendor details, and delivery history spread across spreadsheets and email. A single late shipment is visible, but a recurring bottleneck can take time to spot. People then have to assemble evidence, explain the pattern, and coordinate vendor follow-up themselves.

FrictionOS demonstrates a smaller, evidence-led workflow: provide a task brief and selected shipment records, ask a model to analyze only those records, and show a concise finding and suggested next step. The intent is to reduce manual investigation while keeping the operator in control of consequential actions.

## What the prototype does

- **Google sign-in:** Start with the Google identity flow. Sign-in requests `openid`, `email`, and `profile`; it does not grant Gmail, Sheets, or Drive access.
- **Separate Google tool access:** In **Tools**, choose service scopes and complete a separate OAuth consent flow. The app currently reads Google Sheets records in task investigations.
- **Local file input:** Upload CSV, TSV, or JSON evidence from the device. CSV/TSV use the first row as headers; JSON must be an array of objects. Files must be under 1 MB and up to 500 records are used.
- **Task-specific models:** Select OpenAI or OpenRouter and choose a model each time a task is created. The OpenRouter catalog is queried dynamically and filtered to Grok, Gemini, and Claude families.
- **Evidence analysis:** The investigation endpoint sends the task brief and selected records to the configured model. The prompt tells the model to use the supplied records, distinguish correlation from cause, state when evidence is insufficient, and suggest one next step.
- **Review and audit demonstration:** The Actions & approvals page demonstrates a human review decision and a browser-local audit entry. Approving the example recommendation does not send an email.
- **Finance / Compliance preview:** The preview lays out planned Google, Xero Demo Company, and Slack Free capabilities. Finance agent setup, Xero, and Slack are marked **Adding soon** and are not operational integrations.

## Demo workflow

1. Start at the home page and choose **Continue with Google**.
2. Go to **Tools**. Connect Google services separately if you want to use Google Sheets. You can instead upload a CSV, TSV, or JSON file from the device.
3. Create or select an agent with an appropriate Google Sheets capability if it should read the selected spreadsheet or uploaded records.
4. Open **Tasks**, write an investigation brief, and select the provider and model for that task.
5. Review the result in task history. Open **Actions & approvals** to see the human review and local audit demonstration.

The seeded demo data contains 17 late shipment records for Shree Logistics; 14 rows are marked as passing through Checkpoint B. The dashboard uses that data to illustrate a repeated pattern. This is sample data, not a live carrier feed or a claim about a real vendor.

## Application areas

| Route | Purpose |
| --- | --- |
| `/` | Google sign-in and product overview |
| `/dashboard` | Operations overview and seeded shipment example |
| `/dashboard/tasks` | Create investigations; choose provider and model; review task history |
| `/dashboard/agents` | Create Warehouse / Ops agents, choose their default model, and assign available capabilities; includes Finance / Compliance preview |
| `/dashboard/actions` | Demonstrate approval review and local audit entries |
| `/dashboard/tools` | Connect Google services and select a Google Sheet or local data file |

## Architecture

```mermaid
flowchart LR
  U[Operator] --> UI[FrictionOS Next.js workspace]
  UI -->|task brief + selected records| API[/api/investigate]
  UI -->|Google OAuth sign-in| AUTH[Google Identity]
  UI -->|optional Sheets access| SHEETS[Google Sheets API]
  API -->|OpenAI Responses API| OAI[OpenAI]
  API -->|OpenRouter chat completions| OR[OpenRouter models]
  API --> UI
  UI --> REVIEW[Human review and local audit demo]
```

### Main implementation choices

- **Next.js App Router, React, and TypeScript:** UI pages and server API routes live in the `app/` tree.
- **Server-side model calls:** OpenAI and OpenRouter keys are read from server environment variables and are not exposed with `NEXT_PUBLIC_` names. OpenAI uses the Responses API; OpenRouter uses its Chat Completions API.
- **Google OAuth:** Sign-in is separate from service authorization. A random OAuth state protects the sign-in callback; the Google ID token is checked with Google before the app creates a seven-day, HTTP-only, HMAC-signed session cookie. The HMAC uses `GOOGLE_CLIENT_SECRET`.
- **Scoped Google access:** The Tools flow requests only the selected service scopes. Google Sheets access is per selected file through Picker and the `drive.file` scope.
- **Local prototype state:** Agent configuration, task history, uploaded records, selected source, and the demo audit log are stored in browser `localStorage`. They are not shared between users or devices and do not provide durable server-side audit storage.
- **Human review:** The example approval queue records a local decision. It does not call Gmail or execute an external action.

## Requirements

- Node.js 20 or newer (Node.js 22 is suitable for the current dependency set)
- npm
- Google OAuth web application credentials for sign-in
- An OpenAI API key, an OpenRouter API key, or both, depending on which model provider you plan to use
- Google Picker API key and Cloud project number only if using the Google Sheets Picker

## Run locally

```bash
npm install
Copy-Item .env.example .env.local
# Edit .env.local with your own credentials.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To make a production build:

```bash
npm run build
npm run start
```

## Environment variables

Copy `.env.example` to `.env.local`. Keep provider secrets server-side; do not prefix them with `NEXT_PUBLIC_`.

| Variable | Required for | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI task investigations and OpenAI model list | Server-side OpenAI project key |
| `OPENAI_MODEL` | Default OpenAI model fallback | Defaults to `gpt-5.6-luna` in the investigation route |
| `OPENROUTER_API_KEY` | OpenRouter model list and investigations | Server-side key; model selection is task-specific |
| `GOOGLE_CLIENT_ID` | Google sign-in and Google service OAuth | Google Cloud OAuth web client |
| `GOOGLE_CLIENT_SECRET` | Google sign-in and service OAuth | Also used as the HMAC key for the session cookie |
| `GOOGLE_LOGIN_REDIRECT_URI` | Google sign-in outside the default local URL | Defaults to `{origin}/api/google/login/callback` |
| `GOOGLE_REDIRECT_URI` | Google service authorization outside the default local URL | Defaults to `{origin}/api/google/callback` |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | Google Picker | Restrict this browser key to the needed Google APIs and app origins |
| `NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER` | Google Picker | Google Cloud project number, not the project ID |
| `APP_URL` | OpenRouter request metadata | Optional public app URL; defaults to `http://localhost:3000` |

## Google Cloud setup

1. Create a Google Cloud project and configure the OAuth consent screen. Add your account as a test user while the app is in testing mode.
2. Create an OAuth client for a **Web application**. For local development, add both authorized redirect URIs:
   - `http://localhost:3000/api/google/login/callback` (sign-in)
   - `http://localhost:3000/api/google/callback` (Google service connection)
3. For production, register the matching URLs on the deployed domain and set `GOOGLE_LOGIN_REDIRECT_URI` and `GOOGLE_REDIRECT_URI` to those URLs.
4. Enable Google Sheets API and Google Picker API if you plan to use Sheets. Set `NEXT_PUBLIC_GOOGLE_API_KEY` and `NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER` for Picker.
5. Restart the app after changing environment variables. Sign in first; then grant Google service access from **Tools** as needed.

Google sign-in alone does not authorize data services. The Sheets Picker needs Google service authorization and an explicit file selection.

## Model providers

- **OpenAI:** Calls `POST /v1/responses`; available model IDs are checked against the project models endpoint where possible.
- **OpenRouter:** Calls `POST /api/v1/chat/completions`; the model catalog is loaded from OpenRouter and filtered to IDs in the Grok (`x-ai`), Gemini (`google`), and Claude (`anthropic`) families.
- The API accepts up to a 1,000-character task brief, at most 500 supplied records, and caps model output at 300 tokens. Provider-specific errors are returned to the task UI.

## Request limits

The investigation route currently enforces these application-side limits:

- 3 investigation requests per minute per client IP
- 1 concurrent investigation per client IP
- 10 concurrent investigations across the current server process
- 30-second upstream model request timeout
- 300 model output tokens per investigation

The counters are in memory. They reset on process restart and are not shared across multiple serverless instances. Configure provider-side spend and rate limits in the OpenAI or OpenRouter account separately; the application limiter is not a billing cap.

## Current scope and limitations

- Google Sheets reading is implemented for task investigations. Gmail send, Google Docs/Drive content retrieval, and Google Calendar scheduling are currently capability/setup surfaces, not end-to-end task tools.
- Local uploads support CSV, TSV, and JSON only; Excel `.xlsx` workbooks are not parsed. Upload contents remain in this browser's local storage until replaced or browser storage is cleared.
- Task history, agent settings, uploaded rows, and approval/audit examples use `localStorage`; they are not a multi-user database.
- The approval screen's approve/reject interaction is a local demonstration. It does not send a vendor email.
- Finance / Compliance is a preview. The intended Google finance inputs are Gmail, Sheets, and Drive. Xero Demo Company data (invoices, bills, transactions, accounting data) and Slack Free notifications/approval requests/agent alerts are **Adding soon**.
- The dashboard includes seeded sample shipment records so the workflow can be demonstrated before a live data source is configured.

## What to build next

1. Add durable users, workspaces, task history, approval records, and audit events in a database.
2. Turn Google capabilities into callable, narrowly scoped task tools, including document retrieval and approved email actions.
3. Implement Xero read tools for invoices, bills, transactions, and accounting data, plus Slack notifications and approval routing.
4. Build Finance / Compliance agent templates with reconciliation, invoice matching, exception review, evidence links, and human approval gates.
5. Move request throttling to a shared store for deployments with multiple instances; add observability and provider budget reporting.
6. Add source citations, evaluations, and repeatable task-quality checks so teams can compare findings against known cases.

## Repository map

```text
app/
  api/                  Google OAuth, model catalog, and investigation endpoints
  dashboard/            Overview, tasks, agents, actions, and tools pages
  page.tsx              Google sign-in start page
  globals.css           Shared application styles
lib/
  data.ts               Seed shipment examples
  reasoning.ts          Deterministic shipment pattern calculations
  agent.ts              Warehouse agent demo behavior
  actions.ts            Example vendor email action data
  google-session.ts     Signed Google session cookie helpers
proxy.ts                Dashboard and investigation session gate
GOOGLE_SETUP.md         Google OAuth and Picker setup notes
```
