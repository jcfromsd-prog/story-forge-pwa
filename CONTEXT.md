# StoryForge PWA — Project Context

Use this file to orient any AI agent (Claude Cowork, Claude Code, Chrome agent) picking up this project mid-session. Read this first before doing anything.

---

## What This Is

StoryForge is a Progressive Web App for writers. It uses AI (Claude API via Anthropic) to help with story capture, outlining, character bibles, QA, and voice profiles. It is a full-stack app with a React/Vite frontend and Supabase as the backend (auth, database, Edge Functions).

---

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, PWA (service worker)
- **Backend:** Supabase (Postgres, Auth, Edge Functions)
- **AI:** Anthropic Claude API — called from Supabase Edge Functions (NOT directly from the browser)
- **Deployment:** Vercel (frontend), Supabase cloud (backend)
- **Local path:** `/Users/aev/Documents/Claude/Projects/Story Forge PWA`

---

## Repo & Services

| Service | URL / ID |
|---|---|
| GitHub repo | https://github.com/jcfromsd-prog/story-forge-pwa |
| Vercel deployment | https://story-forge-pwa.vercel.app (check Vercel dashboard for exact URL) |
| Supabase project | https://supabase.com/dashboard/project/fpnlcwxmyodpvmmpxksg |
| Supabase project ID | `fpnlcwxmyodpvmmpxksg` |
| Supabase Edge Function secrets | https://supabase.com/dashboard/project/fpnlcwxmyodpvmmpxksg/functions/secrets |

---

## Environment Variables

### Vercel (set via `vercel env add` during initial deploy)
- `VITE_SUPABASE_URL` = `https://fpnlcwxmyodpvmmpxksg.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = (set — see Supabase dashboard if needed)

### Supabase Edge Function Secrets
- `ANTHROPIC_API_KEY` = must be added manually by the user at the secrets URL above (agents cannot enter API keys)

---

## Current Status (as of 2026-05-10)

- [x] Phase 1 code complete (50 files committed)
- [x] Git repo initialized and pushed to GitHub
- [x] Vercel deployment configured with Supabase env vars
- [ ] Repo visibility: needs to be set to Private (GitHub sudo auth required — user must do this)
- [ ] `ANTHROPIC_API_KEY` added to Supabase Edge Function secrets (user must paste their `sk-ant-...` key)
- [ ] First login / sign-up test on live URL
- [ ] End-to-end AI pipeline test: 30-second voice capture should return story bullets

---

## Key Source Files

```
src/
  App.tsx              — root component, routing
    pages/
        CapturePage.tsx    — voice capture UI
            EditorPage.tsx     — story editor
                BiblePage.tsx      — character/world bible
                    PipelinePage.tsx   — story pipeline
                        QAPage.tsx         — quality assurance
                            VersionsPage.tsx   — version history
                                AuthPage.tsx       — login/signup
                                  lib/
                                      claude.ts          — Anthropic API calls (via Supabase Edge Functions)
                                          supabase.ts        — Supabase client setup
                                              agents.ts          — AI agent logic
                                                  voice.ts           — voice recording
                                                      db.ts              — database helpers
                                                        state/
                                                            store.ts           — Zustand global state
                                                                auth.ts            — auth state
                                                                ```

                                                                ---

                                                                ## How to Resume Work

                                                                1. Open Terminal: `cd "/Users/aev/Documents/Claude/Projects/Story Forge PWA"`
                                                                2. Run `npm run dev` to start local dev server
                                                                3. Make changes, then `git add -A && git commit -m "your message" && git push`
                                                                4. Vercel auto-deploys on push to `main`

                                                                ---

                                                                ## Owner

                                                                GitHub: `jcfromsd-prog`  
                                                                Email: `jcfromsd@gmail.com`  
                                                                This is a solo project — no collaborators.
