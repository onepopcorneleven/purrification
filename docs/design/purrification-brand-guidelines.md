# Purrification — Brand & Design System
*v0.1 — working draft, built from founder intake*

---

## 1. What this is

Purrification analyzes a cat's behavior and prescribes spiritual rituals to cleanse bad energy and improve the cat's wellbeing. The audience isn't casual — these are people who already believe the stars, stones, and unseen forces shape outcomes. They're on their phones, alone with a cat that's acting strange, looking for meaning in it.

**The core idea driving every design decision below:** your cat isn't badly behaved — it's spiritually burdened, and it perceives things you can't. The whole product should feel like it's letting the user peek into that hidden layer of reality.

**Reference points:** antique fortune-telling machines, old-style circus. Think a Zoltar booth crossed with a tarot deck crossed with a modern app — polished enough to trust, mysterious enough to feel like magic.

---

## 2. Brand Personality

Mysterious · Spiritual · Reverent · Slightly theatrical · Trustworthy (this is still asking someone to trust a ritual for their pet)

That last one matters: the aesthetic should feel *ancient and confident*, never cheap or jokey, even though the premise is playful. A user should feel like they've stumbled into a real tradition, not a gimmick.

---

## 3. Logo

**Direction:** the mark should hint that cats are ancient, spiritual entities — their odd behavior isn't naughtiness, it's them reacting to things in another realm. Good territory to explore:

- A cat silhouette merged with a symbol of "otherworldly sight" — a third eye, a crescent moon, a constellation pattern traced through the cat's form
- An engraved "seal" or "sigil" quality — like a wax stamp or an occult emblem, not a friendly app icon
- Linework in gold against dark, evoking engraved metal or candlelit brass

**Needed variants:** full lockup, icon-only mark (favicon/app icon), single-color gold-on-dark version. Keep the icon legible at small sizes — an ornate illustration will fall apart at 16px, so the icon-only version should be a simplified version of the same idea, not a shrunk-down detailed illustration.

**Where it appears:** website header, favicon/app icon, social avatar, and likely a "seal of completion" moment in-product (e.g., after a ritual is done) — worth designing that as a variant now rather than later.

---

## 4. Color

**Palette: deep jewel tones + gold, dark mode only.** No light theme — the dark background *is* the concept (candlelit room, night ritual). See `design-tokens.json` for exact values; summary:

| Role | Color | Use |
|---|---|---|
| Background | Near-black with purple undertone (`#0D0A12`) | App base |
| Surface | Slightly raised plum (`#1A1424`, `#241B33`) | Cards, panels, modals |
| Primary accent | Burgundy (`#7A2048`) | Primary actions, key highlights |
| Secondary | Emerald (`#1F6B4E`) | Secondary actions, success-adjacent states |
| Tertiary | Midnight blue (`#2B3A67`) | Supporting UI, info states |
| Accent | Gold (`#D4AF37`) | Borders, icons, focal highlights, the "candlelight" glow |
| Text | Warm parchment (`#F3E9D8`) | Body copy — chosen for contrast against the dark backgrounds *and* to feel like aged paper, not stark white |

**Rule of thumb:** gold is a spotlight, not a fill. It should outline, underline, and highlight — not cover large areas. Overusing it will read as gaudy rather than candlelit.

**Accessibility note:** the parchment text color against the near-black background gives strong contrast (~14:1) for readability — the mystical mood doesn't need to come at the cost of legibility. Keep body text in `text.primary`/`text.secondary`; save the richer jewel tones for backgrounds, borders, and large UI elements, not small text.

---

## 5. Typography

Three-tier system, because the ornate style that makes a great logo becomes unreadable as body copy:

| Tier | Font | Used for |
|---|---|---|
| Display | Cinzel Decorative | Logo, hero moments only — sparingly |
| Heading | Cinzel | Section headers, ritual names, card titles |
| Body | EB Garamond | All paragraph text, labels, buttons |

All three are free (Google Fonts), which keeps this flexible for a scrappy build. Cinzel gives the "engraved tarot card" feel for headers without sacrificing body readability, since EB Garamond is a genuinely readable text serif at mobile sizes — the ornate mood lives in the headlines and framing, not in every word on screen.

Type scale, spacing, and weights are all specified in `design-tokens.json` under `typography`.

---

## 6. Imagery — AI Generation Rules

All imagery is AI-generated, so **consistency has to come from a shared prompt template**, not individual taste each time someone generates an image. Every image should feel like it belongs to the same tarot deck.

**Visual treatment:** painterly and atmospheric — soft candlelight, fog, glow, like tarot card or vintage occult book illustration. Not photorealistic, not flat vector, not gritty photo-grain.

**Subject matter:** cats, and mysterious human-like or spirit-like figures (robed, veiled, faceless, or otherwise ambiguous). **No real, identifiable people.**

### Reusable prompt template

```
[SUBJECT], painterly tarot-card illustration, soft candlelight glow,
atmospheric fog, deep jewel-tone palette (burgundy, emerald, midnight
blue) with gold linework accents, mystical and ancient mood, ornate
vintage occult aesthetic, ethereal lighting, ultra-detailed brushwork,
dark background --ar [ASPECT RATIO] --style painterly
```

Fill in `[SUBJECT]` per use case (e.g., "a black cat perched on a crescent moon, staring into the void" or "a hooded figure reading tarot cards by candlelight, a cat watching from the shadows"). Keep the style-keyword block identical every time — that's what holds the visual unity together across a growing image library.

**Aspect ratios to standardize now** (avoids ad-hoc cropping later): hero/banner (16:9 or 3:2), card thumbnail (1:1 or 4:5), full-screen ritual moment (9:16 for mobile).

---

## 7. Layout, Shape & Depth

- **Corners:** soft and rounded throughout (`radius.sm`–`radius.lg` in tokens) — this is deliberately *not* the sharp/ornate-frame look; it keeps the product feeling like a modern, trustworthy app rather than a literal antique prop.
- **Depth:** no hard drop shadows. Use soft gold/purple **glow** effects instead (`shadow.glowGoldSm/Md/Lg`, `shadow.glowPurple`) — glow is the product's version of elevation.
- **Density:** default to spacious/airy — this is a reflective, ritual-based experience, not a dense dashboard. Give content room to breathe.
- **Mobile-first:** the target audience is on phones, so design and build mobile layouts first, then adapt up.

---

## 8. Motion

No strong preference was specified, so here's the recommendation: **slow, smooth, dreamy transitions** — fades and soft glow-ins rather than snappy or bouncy motion. Specifics in `design-tokens.json` under `motion`:

- Standard transitions: 300ms, dreamy easing curve
- Entrances: fade + slight upward drift (8px), 450ms
- Use the glow-pulse pattern sparingly — reserve it for one focal element at a time (e.g., a ritual that's "active" or "ready"), never as ambient decoration everywhere, or it stops feeling special.

---

## 9. Components Needed (v1 scope)

Per intake: **buttons, navigation, modals/dialogs, tables, notifications/toasts.**

Design guidance for each:
- **Buttons:** rounded-full or rounded-lg, gold border or gold fill depending on primary/secondary hierarchy, glow on hover/focus
- **Navigation:** dark surface, thin gold hairline border (`border.hairline` token), minimal — let content and imagery carry the mood
- **Modals:** raised surface color, soft glow shadow instead of hard shadow, generous padding
- **Tables:** likely used for behavior-analysis data — keep these the most restrained/legible part of the UI; this is where the mystical styling should recede in favor of clarity
- **Toasts/notifications:** could lean into the theme most — e.g., a small glowing "candle" appearing rather than a generic toast bar

---

## 10. Tech Handoff Notes

- Frontend: **Next.js / TypeScript** (confirmed from repo), Prisma for data
- Tokens delivered as `design-tokens.json` (source of truth) and `tailwind.config.snippet.ts` (ready to merge into `tailwind.config.ts`)
- Fonts: Cinzel Decorative, Cinzel, EB Garamond — all on Google Fonts, easy to load via `next/font/google`

---

## 11. Open Questions / Next Steps

This is a v0.1 draft — a few things worth deciding once the UI designer starts working with it:

1. Logo concept exploration — none exists yet; this doc gives direction but the actual mark needs a design pass (a few sketch directions, then pick one).
2. Component-level details (exact button padding, table row styling, toast animation specifics) — token foundations are set, but the actual component library build is the next layer.
3. Accessibility check on the jewel-tone buttons/backgrounds — the tokens above test well for text-on-background, but any color-on-color combos (e.g., burgundy button + emerald background) should get a contrast check once real screens exist.
