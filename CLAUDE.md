# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Purrification is a learning project (per README.md: "just learning how claude code works") for practicing the full software development lifecycle with Claude Code. The product itself is a playful, fictional wellness app for cat owners who lean spiritual: an owner takes a quiz about their cat's recent behavior and gets a whimsical "spiritual diagnosis" plus a prescribed "cleansing ritual."

## Current state

No application code exists yet — there is no package manifest, build tooling, or source directory. The repository currently holds only planning docs and Claude Code settings. Docs were written in dependency order, each derived from the one before it:

1. `docs/product-brief.md` — the product concept, scope, and proposed tech stack.
2. `docs/requirements.md` — the brief restated as testable requirements (IDs like `R-AUTH-1`, `R-DIAG-2`); functional requirements cover auth, cat management, quiz flow, the diagnosis engine, and result history, plus non-functional requirements for hosting and data persistence.
3. `docs/architecture.md` — how the system will be built to satisfy those requirements: a single Next.js (TypeScript, App Router) app for UI + API routes, PostgreSQL via Prisma/Drizzle, session-based auth, and a deterministic (non-LLM) diagnosis engine. Requirement IDs are cited throughout for traceability.
4. `docs/vps-runbook.md` — one-time provisioning/hardening checklist for the target bare-metal VPS (non-root deploy user, SSH hardening, ufw, fail2ban, TLS via certbot, systemd service, deploy script).
5. `docs/workplan.md` — the sequenced build plan (phases 0–10) tying it all together, from project scaffolding through VPS provisioning and launch.

When implementation begins, update this file's "Current state" section with real build/lint/test commands and an architecture overview reflecting actual code — don't invent them before then. `docs/workplan.md` Phase 0 already tracks this as a task.

## Key decisions to know before touching this repo

- **Diagnosis/ritual generation is rule-based, not an LLM call** — a deterministic mapping from quiz answers to a curated, in-repo content pool (`R-DIAG-2`). This is a first-build simplicity choice, not an oversight.
- **Hosting is a self-managed bare-metal VPS**, not a managed platform like Vercel — the project owns provisioning and hardening (`docs/vps-runbook.md`) as part of the learning goal.
- **Content is edited by committing to seed/config data**, not through an admin CMS — that's explicitly out of scope for this round.
- Two decisions are still open per `docs/architecture.md`: Prisma vs. Drizzle (defaults to Prisma absent a learning-goal reason otherwise), and stateless-signed-cookie vs. DB-backed sessions (starts stateless).

## Accessing the deploy target

The production VPS (`docs/vps-runbook.md`) is reachable over SSH via the alias `purrification-deploy`, configured in the operator's local `~/.ssh/config`. **Always use this alias — never a raw IP address or hardcoded path — in any command, script, or deploy instruction touching the deploy target.** The alias resolves host, user, and key material locally; nothing about that resolution should be duplicated or hardcoded into this repo.
