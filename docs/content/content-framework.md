# Purrification Content Framework

**Purpose:** This document specifies the four content classes that make up a Purrification reading — Question(-Topic), Diagnosis, Treatment, and Ritual — and the deterministic logic that derives one from the next. It is written for an authoring agent that will generate the actual bank of content (real questions, real diagnoses, real treatments, real ritual templates) from these specs.

**Non-goal:** This document does not contain the actual content bank. It contains the *shape* of the content and the *rules* for how pieces connect, plus one fully worked example so the pattern is unambiguous.

---

## 1. The Derivation Pipeline

```
User answers Questions
        │
        ▼
Answers emit weighted TAGS  ───────► (tags are the only thing that survives past this point)
        │
        ▼
Tag totals are matched against DIAGNOSIS trigger rules
        │
        ▼
The matched Diagnosis has one or more linked TREATMENTS (a treatment is a category/philosophy, not yet cat-specific)
        │
        ▼
Within the chosen Treatment, a RITUAL VARIANT is selected by secondary conditions (severity, cat traits, household traits)
        │
        ▼
The Ritual template is instantiated with personalization slots (cat name, human name, room, moon phase, etc.)
        │
        ▼
Final rendered reading: Diagnosis text + Treatment text + Ritual text
```

**Why tags sit in the middle instead of matching questions straight to diagnoses:** questions are allowed to change (reworded, reordered, added, removed) without ever touching diagnosis logic, because diagnosis logic only ever looks at accumulated tags. This is the seam that keeps the questionnaire and the diagnosis engine independently editable.

---

## 2. Class: Question (and Question Topic)

A **Question Topic** is a grouping (e.g. "Territory & Space," "Sleep & Rhythm," "Social Bonds," "Object Relations," "Vocal Behavior"). Topics exist for questionnaire pacing/UI only — they carry no diagnostic weight themselves.

A **Question** belongs to exactly one Topic and has one or more **Answer Options**. Each Answer Option is the actual unit that carries diagnostic meaning, via a set of **Tag Effects**.

### Schema

```json
{
  "id": "q_007",
  "topic_id": "topic_territory",
  "prompt_mystical": "When a stranger crosses the threshold, does your familiar retreat to a high place, or hold their ground below?",
  "prompt_plain": "When guests visit, does your cat go somewhere high up, or stay at floor level?",
  "input_type": "single_select",
  "answers": [
    {
      "id": "a1",
      "label_mystical": "Ascends without hesitation",
      "label_plain": "Goes up high immediately",
      "tag_effects": { "territorial_anxiety": 2, "vigilance": 1 }
    },
    {
      "id": "a2",
      "label_mystical": "Holds the doorway",
      "label_plain": "Stays near the entry, watching",
      "tag_effects": { "territorial_anxiety": 3, "boundary_guarding": 2 }
    },
    {
      "id": "a3",
      "label_mystical": "Unbothered",
      "label_plain": "Doesn't react much",
      "tag_effects": { "territorial_anxiety": -1 }
    }
  ]
}
```

### Fields, explained

| Field | Purpose |
|---|---|
| `topic_id` | Which Topic this question is filed under (UI grouping/pacing only) |
| `prompt_mystical` | The in-voice text shown to the user (ornate, tarot-adjacent register) |
| `prompt_plain` | A literal restatement — used internally for QA and for the "what does this actually mean" tooltip, not shown by default |
| `input_type` | `single_select`, `multi_select`, or `scale` (1–5) |
| `tag_effects` | Signed integer weights added to running tag totals when this answer is chosen |

### Authoring rules for the generation agent
- Every answer option must carry at least one tag effect, even if small or negative — a "neutral" answer that does nothing is a dead end in the logic and should be avoided.
- Negative weights are allowed and useful (an answer can *rule out* a diagnosis, not just point toward one).
- Keep `prompt_plain` and all `label_plain` fields honest and literal — they're the ground truth the diagnosis logic is validated against, even though users never see them.
- Aim for 3–5 answer options per question; fewer than 3 rarely gives the tag system enough resolution.

---

## 3. Class: Diagnosis

A **Diagnosis** is a named "energy imbalance" derived from a rule over accumulated tag totals. It does not contain instructions to fix anything — it only names and describes the problem, and points to the Treatment(s) that address it.

### Schema

```json
{
  "id": "diag_boundary_erosion",
  "name_mystical": "Boundary Erosion",
  "name_plain": "Territorial insecurity from unclear household boundaries",
  "trigger_rule": {
    "all_of": [
      { "tag": "territorial_anxiety", "gte": 5 },
      { "tag": "boundary_guarding", "gte": 2 }
    ],
    "none_of": [
      { "tag": "social_overwhelm", "gte": 6 }
    ]
  },
  "severity_bands": [
    { "min": 5, "max": 8, "label": "mild" },
    { "min": 9, "max": 13, "label": "moderate" },
    { "min": 14, "max": null, "label": "acute" }
  ],
  "description_template": "{cat_name}'s edges have gone soft. The line between 'mine' and 'shared' has blurred, and {cat_name} is spending real energy re-drawing it — at the door, on the sill, in the doorway stare-downs you've probably noticed. This isn't aggression. It's upkeep.",
  "symptom_callback_pool": [
    "the way {cat_name} claims the doorway before guests arrive",
    "the retreat to high ground when the room fills up",
    "the extra patrol laps at dusk"
  ],
  "linked_treatments": ["treat_boundary_restoration"]
}
```

### Fields, explained

| Field | Purpose |
|---|---|
| `trigger_rule` | Boolean logic over tag totals: `all_of` (AND), `any_of` (OR), `none_of` (exclusion). Rules should be checked in a fixed priority order; first full match wins, so ordering diagnoses from most-specific to most-general matters |
| `severity_bands` | Same diagnosis, different intensity of tag score → changes tone/urgency of the rendered text and can gate which Ritual variant is eligible |
| `description_template` | The diagnosis writeup, with slots (`{cat_name}`, etc.) — this is prose the agent generates once per diagnosis, not per user |
| `symptom_callback_pool` | Optional flavor lines the renderer can pick 1–2 from, to make the reading feel like it's citing the user's specific answers back to them (pick lines whose *source question* the user actually triggered high-weight tags on) |
| `linked_treatments` | Ordered list — first is default; additional entries exist for cases where you want to offer an alternate path (e.g. a gentler treatment for mild severity vs. the standard one) |

### Authoring rules for the generation agent
- Every diagnosis needs a trigger rule that is reachable — cross-check against the actual tag vocabulary produced by the question bank, not an imagined one.
- Write one diagnosis per genuinely distinct *pattern*, not one per question. Expect roughly 8–15 diagnoses total for a first content pass; more than that and severity bands should be doing the differentiating work instead.
- Description templates should name a mechanism ("why this is happening"), not just relabel the symptom — this is where the app earns its "insightful, not random" feeling.
- Always define at least one `none_of` exclusion where two diagnoses could plausibly both fire from overlapping tags, so the rule-matching order doesn't silently produce the wrong one.

---

## 4. Class: Treatment

A **Treatment** is the general remedy philosophy for a diagnosis — the "what kind of intervention this is" — before it's been turned into a specific set of steps. Think of it as the category a Ritual is drawn from, not the ritual itself. Multiple diagnoses can share a treatment; multiple rituals can exist under one treatment.

### Schema

```json
{
  "id": "treat_boundary_restoration",
  "name_mystical": "The Rite of Reclaimed Edges",
  "name_plain": "Boundary Restoration",
  "philosophy": "Give {cat_name} a boundary that is visibly, reliably theirs, so the nervous energy spent defending an ambiguous one has somewhere to stand down. This works by adding certainty, not by removing stimulus.",
  "applies_when": "diagnosis in [diag_boundary_erosion, diag_threshold_anxiety]",
  "material_categories": ["a physical marker object", "a scent anchor", "a fixed time-of-day action"],
  "typical_duration": "7–10 days of a nightly minimum-5-minute practice",
  "contraindications": ["households with 3+ cats sharing the same doorway — use the multi-cat ritual variant instead"],
  "ritual_variants": ["ritual_boundary_restoration_std", "ritual_boundary_restoration_multicat", "ritual_boundary_restoration_mild"]
}
```

### Fields, explained

| Field | Purpose |
|---|---|
| `philosophy` | The *why this works* text — this is the paragraph that makes the prescription feel earned rather than arbitrary. Written once, reused across every ritual variant under this treatment |
| `applies_when` | Which diagnoses route here — kept explicit and reversed-indexable from Diagnosis.linked_treatments for QA |
| `material_categories` | Abstract categories (not concrete items yet — concrete items are chosen at the Ritual level) |
| `contraindications` | Household/cat conditions that should route to a *different* ritual variant, or in extreme cases a different treatment entirely |
| `ritual_variants` | The pool the Ritual selection step chooses from |

### Authoring rules for the generation agent
- A treatment should be nameable in one line without referencing any specific ritual step ("more playtime before bed," not "toss the feather wand three times toward the window").
- Expect roughly 1 treatment per 1–2 diagnoses; treatments are allowed to be reused.
- `contraindications` is the mechanism for household realism (multi-cat homes, senior cats, apartment vs. house) — always populate it rather than leaving it empty, since it's the main lever the Ritual layer uses to branch.

---

## 5. Class: Ritual

A **Ritual** is the fully concrete, personalized instance the user actually receives: steps, materials, timing, incantation/chant text if applicable, all resolved from the parent Treatment's philosophy plus the user's specific answers.

### Schema

```json
{
  "id": "ritual_boundary_restoration_std",
  "parent_treatment_id": "treat_boundary_restoration",
  "selection_conditions": {
    "severity_band": ["mild", "moderate"],
    "household_size": "1-2 cats"
  },
  "title_template": "The Reclaiming of {threshold_room}'s Edge",
  "materials": [
    "one small object {cat_name} already sleeps near",
    "a pinch of dried catnip or valerian",
    "a saucer or shallow dish"
  ],
  "steps_template": [
    "At the same hour each evening — ideally as the light starts to change — bring {object} to {threshold_room}.",
    "Set it in the saucer just inside the boundary {cat_name} has been guarding.",
    "Sit for the length of one song, or roughly three minutes, without calling {cat_name} over. Let the approach be their choice.",
    "Once {cat_name} has approached or settled nearby, say quietly: 'This edge is yours to keep, not yours to defend' — the words matter less than the same words, every night.",
    "Leave the object in place overnight. Repeat for 7 nights."
  ],
  "incantation_template": "This edge is yours to keep, not yours to defend.",
  "aftercare_note": "If the guarding behavior fully stops before night 7, keep going anyway — the ritual is what makes the boundary feel earned, not just observed.",
  "personalization_slots": ["cat_name", "threshold_room", "object"]
}
```

### Fields, explained

| Field | Purpose |
|---|---|
| `selection_conditions` | The secondary filter (severity band, household composition, indoor/outdoor status, etc.) that picks this variant over its siblings under the same treatment |
| `title_template` | Rendered ritual name, slot-filled |
| `materials` | Concrete objects — this is where `material_categories` from the Treatment gets made literal |
| `steps_template` | Numbered, imperative, second person ("you"), always slot-filled rather than generic — this is the actual user-facing procedure |
| `incantation_template` | Optional; only for rituals in the tradition that call for a spoken/chanted line |
| `personalization_slots` | Explicit list of every `{slot}` used above — lets the renderer validate all slots have real data before rendering, and lets it fail loudly instead of showing `{cat_name}` literally in production |

### Authoring rules for the generation agent
- Every ritual needs at least 3 concrete, sequential steps — this is the deliverable the user actually performs, so vagueness here is the single biggest quality risk in the whole system.
- `selection_conditions` must be mutually exclusive across sibling variants under the same treatment (no two variants should both match the same user) — if they can overlap, pick a priority order and document it, the same way Diagnosis trigger rules are ordered.
- Reuse the parent Treatment's `philosophy` as connective narration, don't repeat it verbatim — the Ritual should read as "and here, specifically, is how" rather than re-explaining why.
- Keep personalization slots to things the app actually collects (cat name, a named room, an object the user has, possibly time of day/season) — never invent a slot the intake flow can't fill.

---

## 6. Worked Example: Full Chain

1. **Questions answered:** user selects "Holds the doorway" (q_007) → `territorial_anxiety +3, boundary_guarding +2`; two other questions push `territorial_anxiety` to a running total of 7, `boundary_guarding` to 3.
2. **Diagnosis match:** `diag_boundary_erosion` trigger (`territorial_anxiety ≥ 5 AND boundary_guarding ≥ 2, none_of social_overwhelm ≥ 6`) fires. Total of 7 lands in the "moderate" severity band.
3. **Treatment selected:** `linked_treatments[0]` → `treat_boundary_restoration`.
4. **Ritual variant selected:** severity = moderate, household = 1 cat → matches `ritual_boundary_restoration_std` (not the multicat or mild variants).
5. **Rendered output:** slots filled with `cat_name = "Miso"`, `threshold_room = "the front hallway"`, `object = "Miso's blanket corner"` → final diagnosis + treatment + ritual text shown to the user.

---

## 7. Open Questions for You to Settle Before the Agent Starts Generating Content

- **Tag vocabulary:** should this doc define the full canonical tag list up front (recommended — prevents drift across question authoring), or let it emerge and get normalized after a first draft pass?
- **Diagnosis count target:** roughly how many distinct diagnoses do you want for launch — the 8–15 estimate above is a guess, not a decision.
- **Multi-diagnosis handling:** can more than one diagnosis fire for the same user (e.g. present a primary + secondary reading), or is it always exactly one, first-match-wins?
- **Incantations:** ritual-by-ritual, or only for a subset of "high ceremony" treatments, with others staying purely behavioral?
