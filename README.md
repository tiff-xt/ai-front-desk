# AI Front Desk · Willow & Wren

**Live:** https://tiff-xt.github.io/ai-front-desk/

A working prototype of an AI front desk for a (fictional) preschool. Parents get fast answers that are specific to their child and cite their source. Operators control how much the AI may say, see where it struggled, and fix a gap once for every family that asked.

> Willow & Wren, its staff, families and policies are invented. No real personal data.

## The idea

Most AI front desks answer questions about **the center**. Parents ask about **their child, on a specific day**. "Can Maya come in?" depends on her temperature, the illness policy and whether Wednesday is a holiday. "What's for lunch?" depends on her dairy allergy and whether the 9:30 kitchen cutoff has passed.

So the design principle is: **the AI never computes a fact.** Policy logic is deterministic code over a structured source of truth that operators edit. An LLM, if configured, only classifies wording the rules miss and rephrases a grounded draft, and a guard rejects any rephrase that introduces a number, date or weekday not in the computed facts.

## What to try

| As a parent | As an operator |
| --- | --- |
| "I forgot to pack lunch, can you provide one?" → Maya's dairy-free alternate, one-tap add, live cutoff countdown | **Gaps** → *Answer once* → *Publish*: every question in the cluster is re-checked, marked Fixed, and askers are notified in-thread |
| "Maya has a fever" → return-to-care checker that skips closures ("Wed is Veterans Day") | **Autonomy**: per-topic *Answer / Draft for me / Always me*; emergencies and other families' data are locked guardrails |
| "Do kids need costumes for Halloween?" → hands off instead of guessing | **Knowledge**: edit hours, tuition, illness thresholds, menu; health check flags contradictions and stale sections |
| "Who bit my child?" → privacy-safe handoff | **Inbox**: escalations with an AI-drafted reply you edit and send |
| Demo clock → 10:15am, ask about lunch again | **Tests**: 27 golden questions re-run live against your edits |

**Any language.** A parent can write in Spanish (or Chinese, Vietnamese, French…). The question is translated to English, answered from the same facts, then translated back, and the guard checks the translation's numbers, dates and weekdays against the English facts (it understands `$1.890`, `100,4`, `jueves`, `星期四`). Spanish speakers also get a fully Spanish interface. Emergency text uses pre-written translations, never machine translation. Operators see the original and the English, reply in English, and the reply reaches the parent translated and fact-checked.

Every answer shows its status (answered / caveat / with a person / urgent), the source with who updated it and when, and a **Why this answer** trace.

## Architecture

```
src/engine/
  understand.ts   safety screens → intents → entities (dates, symptoms, age bands). Rules first, always.
  policy.ts       pure policy logic: day status, earliest return, lunch plan, tour slots, family tuition
  answer.ts       pipeline: understand → resolve → autonomy → cited Answer (+ staff draft)
  guard.ts        grounding guard for LLM output
  retrieve.ts     inspectable keyword retrieval over handbook sections
  health.ts       contradiction + staleness checks on the source of truth
  gaps.ts         clusters unanswered questions
  evals.ts        golden questions (CI + live Tests tab)
src/store/        one store shared by both views (localStorage + BroadcastChannel)
worker/worker.js  Cloudflare Worker: holds the LLM key; /classify and /phrase only
```

- **Static hosting:** GitHub Pages. No backend needed; the LLM is optional and degrades to rules + templates.
- **CI:** lint → `vitest` golden questions → build → deploy. A policy regression blocks the deploy.
- **Accessibility:** status never relies on color alone; reduced-motion respected; keyboard reachable; light/dark themes.

## Run locally

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # golden questions, policy and guard tests
```

## Enable the LLM (optional)

1. Cloudflare dashboard → **Workers & Pages → Create → Worker**, name it `ai-front-desk-api`, deploy, then **Edit code** and paste `worker/worker.js`.
2. **Settings → Variables and Secrets:** add `LLM_API_KEY` (secret). The Worker picks the best chat model your key can use (providers retire models often); set `LLM_MODEL` to pin one. For a provider other than Groq, also set `LLM_BASE_URL` (any OpenAI-compatible endpoint, e.g. Gemini `https://generativelanguage.googleapis.com/v1beta/openai` with `gemini-2.5-flash`).
3. GitHub repo → **Settings → Secrets and variables → Actions → Variables:** add `FRONT_DESK_API` = your Worker URL. Re-run the deploy workflow.

The header badge switches from **Rules mode** to **LLM + guard**.
