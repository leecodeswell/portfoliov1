# Codex: Ares Client Onboarding

Live website repository confirmed by this repository's README: ares-web.com is deployed here to GitHub Pages via `npm run deploy`; root page lives in `hub/index.html`, portfolio in `/desk/`.

The accompanying ChatGPT deliverable **ares_onboarding_package.zip** contains the complete reference files:
- `contract.html` reusable master services agreement and SOW in graphite design
- `welcome.html` matching onboarding page
- `graphite.css` shared styling
- `CODEX_HANDOFF.md` detailed requirements and acceptance criteria

Integrate into the actual deployment structure **without replacing existing root or desk routes**. Target `/contract/` and `/welcome/`, based on routing in this repo. Contract provider is Lee Thompson (individual; Ares brand). Client portal URL must be configured later, never invent one. Use a legally valid third-party e-signature API / hosted signing flow: client signs then Lee Thompson; both get final signed PDF, with audit trail and server-side security. This functionality cannot be implemented entirely on static GitHub Pages; propose a minimal separate secure backend or hosted provider and obtain necessary API configuration.

A lawyer must review the final agreement before use; keep contracts unpublished/inactive until that happens. Never send contracts automatically. Make a draft PR for review and do not deploy automatically.