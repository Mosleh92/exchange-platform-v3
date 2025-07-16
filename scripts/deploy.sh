#!/usr/bin/env bash
set -euo pipefail

# Color helpers
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log()   { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# Auto-detect Supabase ref
if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
    REF="${SUPABASE_PROJECT_REF}"
elif [[ -f .env ]]; then
    REF=$(grep -Po '(?<=SUPABASE_PROJECT_REF=).*' .env || true)
fi

if [[ -z "${REF:-}" ]]; then
    read -r -p "Paste Supabase Project Ref: " REF
fi

log "Deploying to project: $REF"

# Install CLI if missing
command -v supabase >/dev/null 2>&1 || npm install -g supabase

log "Linking project..."
supabase link --project-ref "$REF"

log "Pushing schema & seed..."
supabase db push

log "Deploying Edge Functions..."
supabase functions deploy

log "Setting secrets..."
supabase secrets set --env-file .env.example

log "Health check..."
curl -fsS "https://${REF}.supabase.co/functions/v1/health" | jq .

log "🚀 SaaS live at: https://${REF}.supabase.co"
