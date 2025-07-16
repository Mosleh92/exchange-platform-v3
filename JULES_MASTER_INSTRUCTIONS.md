# JULES_MASTER_INSTRUCTIONS.md
# 🚀 One-Place Blueprint for Exchange-Platform-v3 → SaaS MVP
# Author: <you>
# Scope: Hand this to Google Labs Jules as the single instruction set.

---

## 0. Meta-Instructions for Jules

1. **Act as**: Senior staff engineer + compliance officer + DevOps lead.
2. **Constraints**:
   - Keep **backward compatibility** (do not break existing demo endpoints).
   - Use **feature flags** (`launchdarkly-node` or `unleash`) for every new flow.
   - Write **tests first** (TDD): unit ≥80 % coverage on new code, contract tests for public APIs.
   - Every commit message must start with one of: `[feat]`, `[fix]`, `[sec]`, `[test]`, `[docs]`, `[ops]`, `[compliance]`.
3. **Branching**: Trunk-based; short-lived feature branches off `main` only.
4. **CI**: Ensure GitHub Actions passes (see Section 11) before merging.
5. **Secrets**: NEVER commit secrets; use AWS Secrets Manager + `dotenv-vault`.

---

## 1. Executive Summary

Take the existing multi-tenant exchange skeleton and deliver a **B2B white-label SaaS MVP** that can:

- Sign up tenants with subscription billing (Stripe).
- Onboard their users via SumSub KYC.
- Provide a white-label web UI (tenant branding config).
- Support crypto deposits/withdrawals (custodial hot/cold wallets).
- Offer a P2P fiat marketplace with automatic escrow release.
- Pass a **Level-1 PCI-DSS SAQ-A** scope and basic pen-test.

---

## 2. 90-Day Milestone Map

| Sprint | Week | Deliverable | Success Metric |
|---|---|---|---|
| 0 | 0 | DevEnv & CI baseline | `make dev` spins up entire stack in <2 min, CI green |
| 1 | 1–4 | KYC + Billing + Audit | First paid tenant onboarded via Stripe |
| 2 | 5–8 | Wallet infra + Trading engine v2 | 100 orders/sec load test passes |
| 3 | 9–12 | White-label UI + i18n + status page | 2 pilot tenants using custom domains |

---

## 3. High-Level Architecture Changes

### 3.1 Infrastructure
- **k8s** (EKS) with Helm charts for backend, frontend, Redis, Mongo, ingress-nginx, cert-manager.
- **Terraform** modules for VPC, RDS-Mongo (Atlas), S3, KMS, ECR.
- **Prometheus + Grafana** for metrics; **Loki** for logs; **Alertmanager** → Slack/PagerDuty.

### 3.2 Security Layer
- **WAF** (Cloudflare or AWS WAF) in front of ingress.
- **Cloud Armor / Rate limiting** at edge.
- **Snyk** or **Trivy** scan in CI for CVEs in images.
- **SAST**: semgrep or CodeQL in CI.

### 3.3 Data & Storage
- **MongoDB Atlas** with:
  - Tenant-level logical DB separation.
  - Point-in-time backups.
- **Redis** (MemoryDB) for pub/sub orderbooks, session cache.
- **Encrypted S3 bucket** for user-uploaded KYC documents (SSE-KMS).

---

## 4. Detailed Task Registry

### 4.1 Compliance & Security (Must-Do First)

| ID | Task | Package/Tool | Acceptance Criteria | Owner |
|---|---|---|---|---|
| C-01 | KYC flow | SumSub SDK | `/kyc/start` returns SDK token, webhook updates user state | BE |
| C-02 | AML screening | Chainalysis KYT | Flag high-risk addresses before deposit credited | BE |
| C-03 | PCI-DSS SAQ-A | Stripe Checkout redirect | No card data touches our servers; SAQ-A attestation signed | BE |
| C-04 | GDPR endpoints | `/gdpr/export`, `/gdpr/delete` | 24-hour SLA, encrypted export zip | BE |
| C-05 | Immutable audit log | `winston-mongodb` capped collection | Append-only, signed hashes | BE |
| C-06 | Secrets management | AWS SM + `aws-secrets-loader` | Zero `.env` files in repo, rotation 90 days | DevOps |
| C-07 | Pen-test baseline | OWASP ZAP baseline scan | No critical/high findings in CI | DevOps |

### 4.2 Wallet & Custody

| ID | Task | Tool | Acceptance Criteria |
|---|---|---|---|
| W-01 | Hot wallet service | Fireblocks / BlockCypher | Create deposit addresses, auto-forward to cold |
| W-02 | Cold wallet policy | Ledger Enterprise / MPC Vault | Withdrawals require 2-of-3 quorum |
| W-03 | Tx monitoring | Blocknative / mempool.space | Confirmations update order state |
| W-04 | Gas abstraction | EIP-1559 + meta-tx relayer | Users pay fees in USDT, not ETH |

### 4.3 Matching Engine v2

| ID | Task | Tech | Notes |
|---|---|---|---|
| M-01 | Orderbook in Redis | `redis-sorted-set` | O(log n) insertion, 10k req/sec |
| M-02 | Trade execution | Node worker thread | Separate CPU core, lock-free |
| M-03 | WebSocket push | `ws` + `socket.io` adapter | Sub-millisecond fan-out |
| M-04 | Snapshot & recovery | Write-ahead log to S3 | Crash recovery <30 sec |

### 4.4 Billing & Multi-Tenant Ops

| ID | Task | Tool | Notes |
|---|---|---|---|
| B-01 | Stripe integration | `stripe-node` | Create customer, subscription, invoicing |
| B-02 | Usage metering | `stripe-meter-events` | Volume-based tiers, 1-hour granularity |
| B-03 | White-label config | JSON schema | `tenant.json` → logo, colors, custom domain |
| B-04 | Custom domain TLS | cert-manager + Let’s Encrypt | Auto-issue on tenant domain CNAME |

### 4.5 Front-End Enhancements

| ID | Task | Library | Notes |
|---|---|---|---|
| F-01 | Onboarding wizard | `react-step-wizard` | Step 1: email, 2: KYC, 3: 2FA |
| F-02 | TradingView chart | `lightweight-charts` | Real-time candle feed from WS |
| F-03 | i18n | `react-i18next` | EN, AR, ES, FR, TR |
| F-04 | White-label loader | Runtime SCSS variables | Inject tenant theme in <200 ms |
| F-05 | PWA manifest | `workbox-webpack-plugin` | Offline cached static assets |

---

## 5. Branch Naming Convention

```
main
  ├── feat/kyc-sumsub
  ├── feat/stripe-billing
  ├── feat/matching-engine-v2
  ├── fix/redis-cluster-reconnect
  ├── sec/pci-saq-a-scope
  ├── ops/helm-chart-backend
  └── docs/api-v2-oas
```

---

## 6. Commit Message Template

```
[type](scope): short imperative description

- Closes #<issue>
- BREAKING CHANGE: <if any>
- Test: <how to test>
- Risk: <low|med|high>
```

---

## 7. Environment & Secrets

### 7.1 Local
```bash
cp backend/.env.example backend/.env.local
make dev          # docker-compose up with hot-reload
```

### 7.2 Staging
- Auto-deploy on every push to `main`.
- Secrets via AWS SM with IAM role for GitHub OIDC.

### 7.3 Production
- Manual approval in GitHub Environments.
- Blue-green via Argo CD.

---

## 8. Testing Matrix

| Layer | Tool | Target | Command |
|---|---|---|---|
| Unit | Jest | ≥80 % | `npm test` |
| Contract | Pact | Consumers & providers | `npm run test:contract` |
| E2E | Playwright | Happy path per role | `npm run test:e2e` |
| Load | k6 | 100 rps, p95 <250 ms | `npm run test:load` |
| Security | OWASP ZAP | 0 criticals | `npm run test:sec` |

---

## 9. Documentation Artifacts

- **OpenAPI 3.1** (`docs/oas.yml`) auto-generated by `tsoa`.
- **ADR folder** (`docs/adrs/`) for every major decision.
- **Tenant-facing guide** (`docs/tenant-onboarding.md`) with screenshots.
- **Runbooks** (`runbooks/`) in markdown for on-call.

---

## 10. Rollback & Incident Playbook

1. **Feature flag off** → immediate mitigation.
2. **Argo CD rollback** → previous image tag.
3. **Database migration** → `migrate-down` job in k8s Job.
4. **Post-mortem** within 24 h, published to `incidents/YYYY-MM-DD-title.md`.

---

## 11. GitHub Actions CI/CD Skeleton

`.github/workflows/ci.yml`
```yaml
name: ci
on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  lint-test-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - uses: aquasecurity/trivy-action@v0.11.0
        with: { image-ref: 'exchange-backend:latest' }
```

---

## 12. Definition of Done (DoD)

A user story is **done** only when:

- Code + tests merged to `main`.
- Feature flag created and default-off.
- OpenAPI spec updated.
- ADR written.
- Runbook updated (if ops-impacting).
- Staging smoke test passed.
- Product owner signs off on demo video.

---

## 13. Communication Channels

- **Daily Slack stand-up** in `#exchange-dev`.
- **Weekly demo** on Fridays, recorded to Drive.
- **Jules updates** posted as PR comments: `Jules-bot: status`.

---

## 14. Final Checklist Before MVP Launch

- [ ] Pen-test report with no criticals.
- [ ] SOC-2 Type I readiness memo.
- [ ] Stripe subscription revenue ≥$1 from pilot tenant.
- [ ] Status page public with 99.9 % uptime SLA.
- [ ] All feature flags documented in `flags.yml`.

---

End of instructions.
Now, Jules – time to execute! 🚀
```
