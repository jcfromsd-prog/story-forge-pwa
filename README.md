# StoryForge

A voice-first writing partner for novels and screenplays. Talk an idea, approve the bullets, write with a Bible-aware AI editor that returns 2-3 options for every story decision and never sounds like AI.

**Cloud-backed:** Your data lives in your own Supabase project. Sign in from any device.

---

## Status

This build includes:

- PWA shell (installable, offline-capable)
- Capture loop (voice → live transcript → AI summary → approve)
- Bible (CRUD, lock, negative constraints, server-side injection into every AI prompt)
- Editor (split-pane, Bible-aware chat, Choice Mode enforced, 8 named revision passes)
- Version Tree (auto-snapshot, AI titling, word-level diff, branching, tagging)
- 7-layer QA Checker + AI Continuity scan
- Voice Profile (calibrated from SYMBIONT prose: avg 22.4-word sentences, variance 18.7, em-dash 4.1/1000)
- Research Library (notes, URLs, file drop)
- 12-stage Publishing Pipeline tracker
- Auth (email + password OR magic link, via Supabase Auth)

**Cloud architecture:**

- Frontend: React 18 + Vite + TypeScript + Tailwind + vite-plugin-pwa
- Backend: Supabase (Postgres + pgvector + Storage + Auth + Edge Functions)
- AI: Claude Sonnet 4.6 (default) via Supabase Edge Function — never directly from the browser
- Hosting: Vercel
- Project ID (Supabase): `fpnlcwxmyodpvmmpxksg`

---

## Activate it (one Terminal command)

From this folder in Terminal:

```bash
./activate.sh
```

The script will:

1. `git init` and commit the code
2. Create the private GitHub repo `story-forge-pwa`
3. Push the code to GitHub
4. Create a Vercel project linked to the GitHub repo
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel env vars
6. Deploy to production
7. Print the live URL

Prerequisites you already have from TeacherSupreme:

- `gh` CLI authenticated (`gh auth status` should show you logged in)
- `vercel` CLI authenticated (`vercel whoami` should print your email)

If either is missing, run `gh auth login` or `vercel login` first.

---

## One final step (1 minute)

After the deploy, open the live URL. Sign in. Then tell the Edge Function your Anthropic API key:

1. Open the Supabase dashboard: https://supabase.com/dashboard/project/fpnlcwxmyodpvmmpxksg/settings/functions
2. Click **Secrets**
3. Click **New secret**
4. Name: `ANTHROPIC_API_KEY`, Value: `sk-ant-api03-...` (your real key)
5. Click **Save**

That's it. Open the app, tap the mic, talk.

---

## Local development

If you want to run locally:

```bash
npm install
npm run dev
```

Open http://localhost:5173. Same auth, same Supabase backend.

---

## Cost summary

| Service | Cost |
|---|---|
| Supabase | $0/month (free tier) |
| GitHub | $0/month (free private repos) |
| Vercel | $0/month (free hobby tier) |
| Anthropic API | Pay-per-use (you already have a paid account) |

Typical AI cost per session: a few cents to a couple of dollars depending on how heavy you go on Craft Agent calls (Sonnet runs ~$3 per million input tokens, ~$15 per million output).

---

## Daily workflow

### Capture

Capture → mic button → talk → stop. AI bullets appear. Tap ✓ to approve each (characters/locations become Bible records automatically). Audio is auto-uploaded to Supabase Storage every 10 seconds — nothing is ever lost.

### Bible

Bible → pick category → click record → edit. Lock 🔒 when final. Locked records get injected into every AI prompt server-side via the Edge Function.

### Editor

Editor → write in the left pane, chat on the right. Type `# Chapter 1` to mark chapters. Select text + click "Get options for selection" to push a passage to chat. Auto-snapshots every 30 seconds.

### Versions

Versions → click A on one snapshot, B on another → word-level diff. Tag versions ("V12 Polish"). Branch from any version.

### QA Checker

QA → "Run all 7 layers" → instant local scan. "AI continuity scan" sends to the Continuity Agent (Claude Sonnet) for deeper analysis.

### Voice Profile

Voice → paste 5-10 samples of your own writing. The Voice Agent uses these (server-side) to rewrite AI output in your voice. Pre-loaded with SYMBIONT calibration.

### Pipeline

Pipeline → 12-stage publishing tracker. Mark stages as in-progress / completed / blocked. AI automation per stage gets wired up in Phase 5/6.

---

## Project structure

```
src/
├── lib/
│   ├── supabase.ts       Supabase client
│   ├── claude.ts         Edge Function wrapper
│   ├── agents.ts         Capture/Craft/Continuity/Voice/Builder agent calls
│   ├── data.ts           CRUD repos (Projects, Bible, Versions, Chat, Voice, Research, QA, Audio)
│   ├── bible.ts          Bible-record helpers
│   ├── versions.ts       Snapshot helpers
│   ├── qa.ts             7-layer local QA scanners
│   ├── voice.ts          Web Speech API + MediaRecorder
│   └── util.ts           Text utilities
├── state/
│   ├── auth.ts           Zustand auth store
│   └── store.ts          Current-project store
├── pages/
│   ├── AuthPage.tsx
│   ├── CapturePage.tsx
│   ├── BiblePage.tsx
│   ├── EditorPage.tsx    (split-pane with ChatPanel)
│   ├── VersionsPage.tsx
│   ├── QAPage.tsx
│   ├── VoiceProfilePage.tsx
│   ├── ResearchPage.tsx
│   ├── PipelinePage.tsx
│   ├── ProjectsPage.tsx
│   └── SettingsPage.tsx
├── components/
│   ├── Layout.tsx
│   ├── Sidebar.tsx
│   ├── TopBar.tsx
│   └── ChatPanel.tsx
├── App.tsx
└── main.tsx
```

---

## Database schema

22 tables in Supabase. RLS enabled on every one — users only see/touch their own data.

Key tables: `projects`, `bible_records` (with `locked`, `negative_constraints`), `versions` (tree with `parent_id` and `branch_name`), `chapters` (embeddings for semantic search), `conversations` + `messages`, `voice_profiles` (auto-seeded by trigger), `research_items`, `qa_reports`, plus publishing tables (`launch_stages`, `marketing_assets`, `arc_readers`, `daily_sales`, `pitch_materials`, `target_companies`, `reviews`).

One RPC: `search_continuity(project_id, query_embedding)` for semantic search across chapters/bible/research.

---

## What's coming next

- **Phase 4**: PDF text extraction, pgvector semantic search wired to UI, export to .docx/.fdx/.fountain/.epub, Save the Cat / Hero's Journey / Story Circle structure overlays.
- **Phase 5**: KDP description generator, ARC reader CRM with email sequences, royalty calculator, financial dashboard.
- **Phase 6**: Film/TV one-sheet, query letter, evidence packet (auto-updating from live sales), target production company list, 90-day KDP Select decision engine.
