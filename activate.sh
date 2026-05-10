#!/usr/bin/env bash
# StoryForge — one-shot activation script
# Run this once from inside the "Story Forge PWA" folder.
# It will:
#   1. git init, commit
#   2. Create private GitHub repo "story-forge-pwa"
#   3. Push code
#   4. Create Vercel project linked to the repo
#   5. Set env vars on Vercel
#   6. Deploy to production
#   7. Print the live URL
#
# Prerequisites you already have from TeacherSupreme:
#   - gh CLI (authenticated)            — check with: gh auth status
#   - vercel CLI (authenticated)        — check with: vercel whoami

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

SUPABASE_URL="https://fpnlcwxmyodpvmmpxksg.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwbmxjd3hteW9kcHZtbXB4a3NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzYyNDYsImV4cCI6MjA5NDAxMjI0Nn0.q4r2t9gkqCpLIx7xgVsNQQ0z_1TvHlzqVADxktlzGh0"

REPO_NAME="story-forge-pwa"
VERCEL_PROJECT_NAME="story-forge-pwa"

echo "=== StoryForge activation ==="
echo ""

# Cleanup leftover build artifacts from sandbox testing
if [ -d "dist" ] || [ -d "dist-check" ] || [ -d "dist-prod" ]; then
  echo "→ cleaning leftover build directories"
  rm -rf dist dist-check dist-prod
fi
rm -f vite.config.ts.timestamp-*.mjs

# 1. Git init
if [ ! -d ".git" ]; then
  echo "→ git init"
  git init -b main
  git add .
  git commit -m "Initial commit: StoryForge PWA (Phase 1 + Supabase backend)"
else
  echo "→ git already initialized"
  git add .
  git diff --cached --quiet || git commit -m "Update: align with framework + Supabase backend"
fi

# 2. Check GitHub auth
echo ""
echo "→ checking GitHub auth"
if ! gh auth status >/dev/null 2>&1; then
  echo "❌ Not signed into GitHub. Run: gh auth login"
  exit 1
fi
echo "  ✓ GitHub auth ok"

# 3. Create GitHub repo (or just push if it exists)
if gh repo view "$REPO_NAME" >/dev/null 2>&1; then
  echo "→ GitHub repo '$REPO_NAME' already exists; pushing"
  git remote remove origin 2>/dev/null || true
  GH_USER=$(gh api user --jq .login)
  git remote add origin "git@github.com:${GH_USER}/${REPO_NAME}.git"
  git push -u origin main
else
  echo "→ creating private GitHub repo '$REPO_NAME'"
  gh repo create "$REPO_NAME" --private --source=. --push --description "Voice-first writing partner for novels and screenplays"
fi
echo "  ✓ GitHub repo ready"

# 4. Check Vercel auth
echo ""
echo "→ checking Vercel auth"
if ! vercel whoami >/dev/null 2>&1; then
  echo "❌ Not signed into Vercel. Run: vercel login"
  exit 1
fi
echo "  ✓ Vercel auth ok: $(vercel whoami)"

# 5. Link / create Vercel project
echo ""
echo "→ linking Vercel project"
if [ -d ".vercel" ]; then
  echo "  ✓ already linked"
else
  vercel link --yes --project "$VERCEL_PROJECT_NAME" 2>&1 || \
    vercel --yes --name "$VERCEL_PROJECT_NAME" --confirm 2>&1 || \
    true
fi

# 6. Set environment variables (idempotent — `vercel env add` errors if var exists, so we remove first)
echo ""
echo "→ setting Vercel environment variables"
for ENV in production preview development; do
  echo "$SUPABASE_URL" | vercel env add VITE_SUPABASE_URL $ENV --force 2>/dev/null || \
    (vercel env rm VITE_SUPABASE_URL $ENV --yes 2>/dev/null; echo "$SUPABASE_URL" | vercel env add VITE_SUPABASE_URL $ENV)
  echo "$SUPABASE_ANON_KEY" | vercel env add VITE_SUPABASE_ANON_KEY $ENV --force 2>/dev/null || \
    (vercel env rm VITE_SUPABASE_ANON_KEY $ENV --yes 2>/dev/null; echo "$SUPABASE_ANON_KEY" | vercel env add VITE_SUPABASE_ANON_KEY $ENV)
done
echo "  ✓ env vars set"

# 7. Deploy
echo ""
echo "→ deploying to production"
vercel --prod --yes

echo ""
echo "=================================="
echo "✅ StoryForge is live."
echo ""
echo "Next steps:"
echo "  1. Open the live URL printed above"
echo "  2. Sign in (create account with email + password)"
echo "  3. Open Supabase dashboard → Edge Functions → Secrets"
echo "     https://supabase.com/dashboard/project/fpnlcwxmyodpvmmpxksg/settings/functions"
echo "     Add: ANTHROPIC_API_KEY = sk-ant-api03-..."
echo "  4. Tap the mic and start talking."
echo "=================================="
