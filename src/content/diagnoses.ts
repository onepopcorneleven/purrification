// The diagnosis/ritual content pool (R-DIAG-2). getDiagnosis (src/lib/
// diagnosis/getDiagnosis.ts) indexes into this array — it never branches on
// individual answers, so every entry here must stand on its own as a
// plausible result for *any* quiz attempt.
//
// Tone guardrail (R-TONE-1), applied at content-review time rather than
// runtime: whimsical and tongue-in-cheek, never mystical-scammy, never
// phrased as real medical/behavioral advice.

export interface DiagnosisEntry {
  diagnosisText: string;
  ritualText: string;
  /** Filename under public/images/diagnoses/ — a painterly tarot-card
   * illustration for this archetype, generated through the brand doc's
   * (docs/design/purrification-brand-guidelines.md §6) reusable prompt
   * template at 4:5 ("card thumbnail" per its aspect-ratio table). See
   * docs/design-upgrade-round-2.md's WP2. */
  image: string;
}

export const diagnosisPool: DiagnosisEntry[] = [
  {
    diagnosisText:
      "Mercury retrograde has clogged your cat's third eye. They're not ignoring you — they're recalibrating.",
    ritualText:
      "Set out a fresh cardboard box facing the nearest window. Let them sit in it, unbothered, for one full sunbeam cycle.",
    image: "mercury-retrograde.png",
  },
  {
    diagnosisText:
      "Your cat has absorbed residual negative energy from the vacuum cleaner. It's still in there, humming quietly.",
    ritualText:
      "Perform a lint-roller smudge stick pass along their favorite perch. Speak softly. Do not vacuum for 24 hours.",
    image: "vacuum-residue.png",
  },
  {
    diagnosisText:
      "A minor chaos spirit has taken up residence in the cardboard box. Your cat is guarding the threshold.",
    ritualText:
      "Offer a small catnip blessing at the mouth of the box. Back away slowly and let them finish the ritual alone.",
    image: "chaos-spirit-box.png",
  },
  {
    diagnosisText:
      "Your cat's whiskers have picked up on a shift in the household's moon-phase alignment.",
    ritualText:
      "Move their food bowl six inches to the left, just for tonight. Announce the change out loud before doing it.",
    image: "moon-phase-whiskers.png",
  },
  {
    diagnosisText:
      "The 3am zoomies are a purification ritual your cat invented and has not yet explained to you.",
    ritualText:
      "Leave one hallway light on and do not intervene. Let the ritual complete itself.",
    image: "three-am-zoomies.png",
  },
  {
    diagnosisText:
      "Your cat has detected a disturbance in the sunbeam schedule and is quietly displeased about it.",
    ritualText:
      "Reposition a cushion directly in today's strongest patch of sunlight, and apologize for the inconvenience.",
    image: "sunbeam-schedule.png",
  },
  {
    diagnosisText:
      "An old houseguest left behind a lingering aura, and your cat has appointed themselves its sole critic.",
    ritualText:
      "Fluff every cushion in the room once, counter-clockwise, while your cat supervises from a safe distance.",
    image: "houseguest-aura.png",
  },
  {
    diagnosisText:
      "Your cat's aloofness is a form of advanced meditation, not a personal rejection of you specifically.",
    ritualText:
      "Sit near them without making eye contact for five minutes. Let them approach first, on their own spiritual timeline.",
    image: "meditative-aloofness.png",
  },
  {
    diagnosisText:
      "The empty corner your cat keeps hissing at holds a very minor, very confused static charge.",
    ritualText:
      "Pet the corner once, gently, in full view of your cat, to demonstrate it's been handled.",
    image: "static-corner.png",
  },
  {
    diagnosisText:
      "Your cat's sudden pickiness at mealtime is a ceremonial fast, not a comment on the food.",
    ritualText:
      "Warm their usual food for ten extra seconds and present it with both hands, like an offering.",
    image: "ceremonial-fast.png",
  },
];
