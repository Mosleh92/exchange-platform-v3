#!/usr/bin/env bash
set -euo pipefail
echo "🔍 Auto-detecting & deploying from GitHub to Supabase …"

# 1️⃣  Detect if we are **inside** a GitHub repo
if [[ ! -d .git ]]; then
  echo "⚠️  Not inside a repo — cloning demo"
  git clone https://github.com/Mosleh92/exchange-platform-v3.git .
fi

# 2️⃣  Install Supabase CLI (idempotent)
command -v supabase >/dev/null 2>&1 || npm install -g supabase

# 3️⃣  Login (token from GitHub Secret or prompt once)
supabase login --no-browser 2>/dev/null || true

# 4️⃣  Detect or ask for Supabase project ref
if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  REF=$SUPABASE_PROJECT_REF
elif [[ -f .env ]]; then
  REF=$(grep -Po '(?<=SUPABASE_PROJECT_REF=).*' .env || true)
else
  read -rp "🆔 Supabase Project Ref: " REF
fi

# 5️⃣  Link & push (schema + seed + functions)
supabase link --project-ref "$REF"
supabase db push --project-ref "$REF"
supabase functions deploy   --project-ref "$REF"

# 6️⃣  Auto-inject secrets
[[ -f .env.example ]] && supabase secrets set --env-file .env.example

# 7️⃣  Health-check
curl -fsS "https://${REF}.supabase.co/functions/v1/health" | jq -r .

echo "✅  SaaS ready → https://${REF}.supabase.co"
