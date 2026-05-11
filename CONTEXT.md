# StoryForge — Project Context for Future AI Sessions

If you're an AI agent (Cowork, Claude Code, Chrome extension, or any other Claude session) starting work on this project, read this first. You'll be up to speed in 60 seconds.

## Owner

JC Morris (jcfromsd@gmail.com). Non-coder. Don't assume technical fluency — explain in plain language, ask before doing anything risky, and prefer one-command solutions over multi-step shell sequences.

## What this project is

A voice-first PWA writing partner for novels and screenplays. The author talks ideas freely; the app transcribes, summarizes into approved bullets, and files them into a "Story Bible" that gets injected into every AI prompt so the model can never contradict locked story decisions.

Read `README.md` and `StoryForge_PWA_Project_Brief_2026-05-10.md.docx` for the full vision. The brief is the source of truth — it describes 19 modules and a 6-phase build plan.

## Live URLs

- **Production app**: https://story-forge-pwa.vercel.app
- **GitHub repo**: https://github.com/jcfromsd-prog/story-forge-pwa (visibility currently public; owner is flipping to private)
- **Vercel project**: `james-projects-6aa7c06b/story-forge-pwa` (auto-deploys on push to `main`)
- **Supabase project**: `Story-Forge-Prod`, ID `fpnlcwxmyodpvmmpxksg`, region `us-east-2`
  - Dashboard: https://supabase.com/dashboard/project/fpnlcwxmyodpvmmpxksg
  - API URL: https://fpnlcwxmyodpvmmpxksg.supabase.co
  - Edge Functions: https://supabase.com/dashboard/project/fpnlcwxmyodpvmmpxksg/functions
  - Secrets: https://supabase.com/dashboard/project/fpnlcwxmyodpvmmpxksg/functions/secrets

## Critical: do NOT touch TeacherSupreme

JC's other project, `Teacher-Supreme-Prod` (Supabase ID `musdakzuupvyctlwctkr`), and its associated GitHub + Vercel resources are a SEPARATE production app. Never run migrations, push code, deploy, or modify env vars on that project. Always verify the project ID before any Supabase action.

## Tech stack

- React 18 + Vite 5 + TypeScript + Tailwind 3 + vite-plugin-pwa
- Supabase (Postgres 17 + pgvector + Auth + Storage + Edge Functions)
- **Dual-provider AI**: Gemini 2.5 Pro is the primary (free with JC's student access), Anthropic Claude Sonnet 4.6 is the automatic fallback. The Edge Function `claude` (named for legacy reasons — actually provider-agnostic) tries Gemini first, falls back to Anthropic if Gemini errors or the key is missing.
  - Smart tier: `gemini-2.5-pro` / `claude-sonnet-4-6` — Capture, Craft, Continuity, Voice
  - Fast tier: `gemini-2.5-flash` / `claude-haiku-4-5-20251001` — Builder (version titling only)
  - Provider can be overridden per-call via `provider: "gemini" | "anthropic"` in the request body
- Zustand for state, React Router for navigation, `diff` for word-level version diffs

## Architecture

The browser only ever calls Supabase (data + auth + storage) and the Supabase Edge Function `claude` (AI). The AI provider keys live **only** as Supabase secrets — never in client code, never in `.env.local`, never bundled:

- `GEMINI_API_KEY` (primary, free via student access)
- `ANTHROPIC_API_KEY` (fallback)

Set either or both. The edge function picks Gemini first if both exist. It fetches the user's locked Bible records and voice profile from Postgres (RLS enforced via the caller's JWT) and injects them into the system prompt before calling the chosen provider.

## Database

22 tables, 22 RLS policies, all scoped through `user_owns_project(project_id)`. Trigger `seed_voice_on_project_insert` auto-creates a calibrated voice profile (SYMBIONT defaults: avg sentence 22.4 words, variance 18.7, full anti-pattern list) on every new project.

Key tables: `projects`, `bible_records` (with `locked`, `negative_constraints`), `versions` (tree with `parent_id` and `branch_name`), `chapters` (embeddings), `conversations` + `messages`, `voice_profiles`, `research_items`, `qa_reports`, plus publishing pipeline tables (`launch_stages`, `marketing_assets`, `arc_readers`, `daily_sales`, `pitch_materials`, `target_companies`, `reviews`).

One RPC: `search_continuity(project_id, query_embedding)` — semantic search across chapters/bible/research.

## Source file map

- `src/lib/supabase.ts` — Supabase client
- `src/lib/claude.ts` — Edge Function wrapper
- `src/lib/agents.ts` — Capture/Craft/Continuity/Voice/Builder agent calls
- `src/lib/data.ts` — All CRUD repos (Projects, Bible, Versions, Chat, Voice, Research, QA, Audio)
- `src/lib/bible.ts` — Bible helpers (lock/unlock, violation scan)
- `src/lib/versions.ts` — Snapshot + auto-snapshot helpers
- `src/lib/qa.ts` — 7-layer local QA scanners (duplicates, fragments, word count, bible consistency, timeline, proofread, LLM patterns)
- `src/lib/voice.ts` — Web Speech API + MediaRecorder voice capture class
- `src/state/auth.ts` — Zustand auth store (email/password + magic link)
- `src/state/store.ts` — Current-project store
- `src/pages/*.tsx` — One file per top-level route (AuthPage, CapturePage, BiblePage, EditorPage, VersionsPage, QAPage, VoiceProfilePage, ResearchPage, PipelinePage, ProjectsPage, SettingsPage)
- `src/components/{Layout,Sidebar,TopBar,ChatPanel}.tsx` — Shared UI

## Build status

Phase 1 (MVP) complete. Phases 2-3 partial:
- ✅ Voice capture loop (record → live transcript → AI summary → approve → file to Bible)
- ✅ Bible CRUD with locked records + negative constraints + server-side injection
- ✅ Editor split-pane with Bible-aware chat, Choice Mode enforced
- ✅ Version Tree (auto-snapshot, AI titling, diff, branching, tagging)
- ✅ 7-layer QA Checker + AI Continuity Agent
- ✅ Voice Profile (SYMBIONT-calibrated)
- ✅ Research Library (notes + URLs + file drop)
- ✅ 12-stage Publishing Pipeline tracker (UI only — automation hooks pending Phase 5/6)
- ✅ Supabase backend with auth, RLS, storage bucket for audio
- ✅ Vercel auto-deploy from GitHub

## What's NOT done (next sessions)

**Phase 4:** PDF text extraction (research library), pgvector semantic search wired to UI (`search_continuity` RPC exists, no UI yet), exports to `.docx` / `.fdx` / `.fountain` / `.epub`, structure overlays (Save the Cat, Hero's Journey, Story Circle, Three-Act).

**Phase 5:** KDP description generator, ARC reader CRM with email sequences, royalty calculator, financial dashboard, Amazon ads ROI tracker.

**Phase 6:** Film/TV one-sheet generator, query letter generator, evidence packet (auto-updating from `daily_sales` data), target production company list, 90-day KDP Select stay-or-go-wide decision engine, post-launch analytics dashboard.

## Working principles

1. **Bible is law** — every AI call gets locked records injected server-side. Never let the model override locked decisions; flag violations instead.
2. **Choice Mode is enforced** — for any story-affecting decision, the AI returns 2-3 options with tradeoffs. Never a single answer. JC stays the author.
3. **Voice profile is mandatory** — all AI prose runs through the voice agent before showing to JC. The anti-pattern list (`delve`, `tapestry`, `realm`, `moreover`, `furthermore`, `tricolons-as-default`, `Not X. Y.` constructions) must never appear in output.
4. **Nothing is ever lost** — voice capture auto-uploads audio to Supabase Storage every 10 seconds. Every save creates a version snapshot. The user can roll back, branch, and compare any two versions.
5. **JC is non-technical** — always explain in plain language, prefer one-command solutions, never assume CLI fluency. When in doubt, ask before acting on real services.

## Remaining setup (as of last session)

1. JC needs to paste their **Gemini API key** into Supabase secrets at:
   https://supabase.com/dashboard/project/fpnlcwxmyodpvmmpxksg/functions/secrets
   (Name: `GEMINI_API_KEY`, Value: the key from https://aistudio.google.com/apikey)
   Optionally also add `ANTHROPIC_API_KEY` as a fallback.
2. JC plans to flip GitHub repo from public to private via Settings → Danger Zone → Change visibility.

Once #1 is done, the app is fully functional. Open https://story-forge-pwa.vercel.app, sign up, tap the mic, talk.
