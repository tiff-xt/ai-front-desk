# AI Front Desk · Willow & Wren

**Live:** https://tiff-xt.github.io/ai-front-desk/

A working prototype of an AI front desk for a (fictional) preschool. Parents get fast answers that are specific to their child and cite their source. Operators control how much the AI may say, see where it struggled, and fix a gap once for every family that asked.

> Willow & Wren, its staff, families and policies are invented. No real personal data.

## The idea

Most AI front desks answer questions about **the center**. Parents ask about **their child, on a specific day**. "Can Maya come in?" depends on her temperature, the illness policy and whether Wednesday is a holiday. "What's for lunch?" depends on her dairy allergy and whether the 9:30 kitchen cutoff has passed.

So the design principle is: **the AI never computes a fact.** Policy logic is deterministic code over a structured source of truth that operators edit. An LLM, if configured, only does two things: classifies wording the rules miss, and translates grounded answers for parents who write in another language. A guard checks every translation both ways: it rejects any number, date or weekday the facts don't support, and any number the translation dropped. English answers keep their exact template wording; in testing, a "friendlier" LLM rewrite once dropped a child's allergy, so we don't paraphrase policy.

## What to try

| As a parent                                                                                                                              | As an operator                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| "I forgot to pack lunch, can you provide one?" → Maya's dairy-free alternate, one-tap add, live cutoff countdown                         | **Gaps** → _Answer once_ → _Publish_: every question in the cluster is re-checked, marked Fixed, and askers are notified in-thread |
| "Maya has a fever" → return-to-care checker that skips closures ("Wed is Veterans Day")                                                  | **Autonomy**: per-topic _Answer / Draft for me / Always me_; emergencies and other families' data are locked guardrails            |
| "Do kids need costumes for Halloween?" → hands off instead of guessing                                                                   | **Knowledge**: edit hours, tuition, illness thresholds, menu; health check flags contradictions and stale sections                 |
| "Who bit my child?" → privacy-safe handoff                                                                                               | **Inbox**: real conversations: an AI-drafted first reply, then back-and-forth with the parent until you mark it resolved           |
| Demo clock → 10:15am, ask about lunch again                                                                                              | **Tests**: 27 golden questions re-run live against your edits                                                                      |
| History (clock icon): every conversation this school year, by month; search “refund” or “october”; filter by Ms. Rivera, Saved, or child | **Inbox → Waiting on parent**: replies stay open until you resolve them                                                            |

**Any language.** A parent can write in Spanish (or Chinese, Vietnamese, French…). The question is translated to English, answered from the same facts, then translated back, and the guard checks the translation's numbers, dates and weekdays against the English facts (it understands `$1.890`, `100,4`, `jueves`, `星期四`). The interface itself is translated into Spanish, Chinese and Vietnamese, and switches automatically when a parent writes in one of them (adding a language is one file in `src/lib/i18n/`). Emergency text uses pre-written translations, never machine translation. Operators see the original and the English, reply in English, and the reply reaches the parent translated and fact-checked.

Every answer shows its status (answered / caveat / with a person / urgent), the source with who updated it and when, and a **Why this answer** trace.

## Code map

Three layers, and dependencies only point down: **UI → store → engine → data**. The engine has no React and no state, so everything it does is unit-tested.

```
src/
  data/          The center's source of truth (fictional): types.ts, seed.ts
  engine/        Pure logic. No React, no state.
    respond.ts     ★ start here: the whole path of one question, in four numbered steps
    answer.ts      rules pipeline: understand → resolve per topic → autonomy → cited Answer
    understand.ts  safety screens first, then intents and entities (dates, symptoms, ages)
    policy.ts      policy math: day status, earliest return, lunch plan, tour slots, tuition
    retrieve.ts    keyword search over handbook sections (inspectable on purpose)
    guard.ts       checks LLM output both ways: nothing invented, nothing dropped, any language
    llm.ts         client for the Worker (/understand, /classify, /phrase); optional
    health.ts      contradictions and stale data in the source of truth
    gaps.ts        groups unanswered questions so staff answer once
    evals.ts       golden questions, run by CI and by the Staff → Tests tab
  store/         One shared store (localStorage + BroadcastChannel) and its actions
  lib/           Small utilities: time, i18n (parent UI strings), lang, storage, ics, cx
  components/    Shared UI primitives: Mark, StatusPill, Segmented, StaffAvatar…
  shell/         App chrome: top bar, guided tour, demo menu
  parent/        The parent front desk (Header, Today, Thread, Composer, cards/)
  operator/      The staff console (Overview, Inbox, Gaps, knowledge/, Autonomy, Tests)
worker/          Cloudflare Worker that holds the LLM key
```

### How a question flows

1. `parent/Composer.tsx` calls `ask()` in `store/store.ts`.
2. `ask()` calls `respond()` in `engine/respond.ts`:
   1. **Language:** non-English is translated to English (`llm.understandLanguage`).
   2. **Answer:** `answerQuestion()` (`engine/answer.ts`) runs the safety screens and intent rules (`understand.ts`), computes facts (`policy.ts` or `retrieve.ts`), applies the operator's autonomy setting, and returns an `Answer` with status, text, card, sources and a trace.
   3. **Classify:** only if the rules found nothing, the LLM suggests a topic and the rules answer it.
   4. **Localize:** translation into the parent's language, checked by `guard.ts`.
3. `ask()` saves the answer to the log, adds it to the staff inbox if it needs a person, and the UI re-renders: `parent/Thread.tsx` on the phone and `operator/*` in the console.

- **Static hosting:** GitHub Pages. No backend needed; the LLM is optional and degrades to rules + templates.
- **CI:** lint → `vitest` golden questions → build → deploy. A policy regression blocks the deploy.
- **Accessibility:** status never relies on color alone; reduced-motion respected; keyboard reachable; light/dark themes.

## Links into the demo

Every view can be linked directly, e.g. for a write-up:

- Staff console, Gaps tab: `?view=staff&tab=gaps`
- Parent app in Spanish: `?view=parent&lang=es`
- Open the guided tour: `?tour=1`

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
