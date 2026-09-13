# Phase 14 — Rich content authoring pass

Extended notes for `docs/workplan.md`'s Phase 14 entry.

## Context

The actual content-design work `docs/content/content-framework.md` was
written to drive — distinct in kind from Phase 13's plumbing (editorial/tone
judgment, not schema/engine work). Authored outside the repo first (per
instruction), then validated against `prisma/schema.prisma` and
`prisma/seed/index.ts`'s `validate()`, committed, and deployed live
2026-09-09: 17 tags, 5 topics, 20 questions/85 answers, 10 treatments, 12
diagnoses (11 pattern-based + 1 catch-all — one more than originally
sketched, kept for finer-grained coverage), 19 rituals. The Phase 13
placeholder content's ids are entirely disjoint from the new ones; since
production already had real `Diagnosis` rows (22 by the time of this
deploy) referencing 9 of the 10 placeholder diagnoses and `Diagnosis`'s FKs
into `DiagnosisDef`/`Treatment`/`Ritual` are `onDelete: Restrict`, the
placeholder rows were retired via `isActive: false` (`Question`,
`Treatment`, `DiagnosisDef`, `Ritual` — the four content classes that carry
the flag), never hard-deleted, exactly as `content-storage-architecture.md`
§5/§6 specifies. Stale `Tag`/`QuestionTopic` ids (no `isActive` field on
those classes) were left as harmless unused rows.

## Execution notes

- Defined the canonical tag vocabulary up front, before any question or
  diagnosis authoring began (per `content-storage-architecture.md` §10.1).
- Authored a full question bank organized into topics, each answer option
  carrying real tag effects.
- Authored `DiagnosisDef` entries (per §10.2) with real trigger rules,
  including a `none_of` exclusion wherever two diagnoses could plausibly
  both fire from overlapping tags.
- Authored the corresponding `Treatment` entries with real, populated
  `contraindications` the app can actually evaluate (severity-based this
  round, not cat-trait-based — see §9 point 6).
- Authored `Ritual` variants selected by severity band, each with at least
  3 concrete sequential steps and a per-ritual incantation decision
  (structural support already in place per §10.4).
- **Not yet done, flagged for follow-up**: a full tone/content review of
  every new entry against R-TONE-1/R-TONE-2.
- Re-ran `npm run db:seed-content` against the real content and re-verified
  all seed-time invariants at real scale — confirmed exactly one active
  catch-all (`diag_equilibrium`, priority 12, strictly highest among the 12
  active rows) via direct query post-deploy.
- Golden-path smoke test confirming a real answer set routes through
  `getDiagnosis` end-to-end (tag accumulation, trigger-rule match, severity
  banding, template rendering) against the live DB with no totality-guard
  errors. **Not yet done, flagged for follow-up**: multi-path coverage
  exhaustively exercising all 12 diagnoses.

## Execution log — 2026-09-09

- Content bank authored outside the repo (`~/purrification-content/`),
  validated against schema/seed-script logic; one bug found (all 85
  `AnswerOption` entries missing required `sort_order`) and fixed.
- Copied into `prisma/seed/content/`, committed, merged to `main` via
  PR #20.
- Deployed via the standard step-12 pipeline; `npm run db:seed-content`
  upserted the new content and reported the (expected) stale placeholder
  ids; those were then set `isActive: false` directly (`psql`) *before*
  `systemctl restart`, so the running app never observed both the old and
  new catch-all diagnoses active at once.
- Verified: exactly one active catch-all post-deactivation; homepage and
  `/login` return correct responses post-restart; `getDiagnosis` run
  directly against the live DB with a full new-content answer set returns a
  correctly rendered diagnosis/ritual with no errors.
