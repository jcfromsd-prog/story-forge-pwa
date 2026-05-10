# StoryForge — Activate Now

Everything is ready. Three things to do, in order:

## 1. Run the activation script (30 seconds)

Open Terminal. Copy and paste these two lines:

```bash
cd "/Users/aev/Documents/Claude/Projects/Story Forge PWA"
./activate.sh
```

You'll see:

- `→ git init` (creates the local repo)
- `→ creating private GitHub repo 'story-forge-pwa'` (uses your existing `gh` auth)
- `→ checking Vercel auth` (uses your existing `vercel` auth)
- `→ setting Vercel environment variables`
- `→ deploying to production`

When it finishes, it prints your **live URL** — something like `https://story-forge-pwa.vercel.app` or `https://story-forge-pwa-jcfromsd.vercel.app`.

## 2. Add your Anthropic API key to Supabase (1 minute)

Open this link:

**https://supabase.com/dashboard/project/fpnlcwxmyodpvmmpxksg/settings/functions**

(this is the Story-Forge-Prod project — separate from Teacher-Supreme-Prod)

1. Click **Secrets** in the left sidebar (under Edge Functions)
2. Click **New secret**
3. Name: `ANTHROPIC_API_KEY`
4. Value: paste your `sk-ant-api03-...` key
5. Click **Save**

## 3. Open the app and use it

Open the live URL on your phone or laptop. You'll see the sign-in screen.

- **First time**: click "Create account", enter your email + a password (6+ chars). You'll be signed in immediately.
- **Returning**: sign in.

You'll be on the Capture tab. Tap the orange mic. Talk for 30 seconds about anything from your story. Tap stop. The AI will return bullets. Approve them. They land in your Bible.

You're using StoryForge.

## Install on your phone (optional)

In Safari/Chrome on iOS: Share → Add to Home Screen
In Chrome on Android: three-dot menu → Install app

It runs in its own window. The capture loop and editor work offline; AI features need internet.

---

## Cost recap

| Service | Cost |
|---|---|
| Supabase (Story-Forge-Prod) | $0/month |
| GitHub (private repo) | $0/month |
| Vercel (hobby tier) | $0/month |
| Anthropic API | Pay-per-use, you already have a paid account |

---

## Your other projects are untouched

I created **Story-Forge-Prod** as a brand new Supabase project (`fpnlcwxmyodpvmmpxksg`), separate from **Teacher-Supreme-Prod** (`musdakzuupvyctlwctkr`). The schema, RLS policies, edge function, and storage bucket all live in Story-Forge-Prod. Nothing in TeacherSupreme was touched.

GitHub: new repo `story-forge-pwa`. Vercel: new project `story-forge-pwa`. No risk to teachersupreme.com.

---

## If something doesn't work

**"gh: command not found"** — Install: `brew install gh`, then `gh auth login`.

**"vercel: command not found"** — Install: `npm install -g vercel`, then `vercel login`.

**"ANTHROPIC_API_KEY missing" when you try to capture** — You skipped step 2. Add the key in Supabase secrets.

**The mic doesn't work** — Use Chrome or Edge for best results. Safari/iOS records audio but doesn't do live transcripts.

**Anything else** — Tell me what broke and I'll fix it.
