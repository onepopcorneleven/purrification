import { Cormorant_Garamond, Fraunces, Baloo_2 } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--preview-font-mystic",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--preview-font-cottage",
});
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--preview-font-pastel",
});

type Mood = {
  name: string;
  blurb: string;
  fontVar: string;
  vars: React.CSSProperties;
};

const moods: Mood[] = [
  {
    name: "Mystic Twilight",
    blurb:
      "Deep plum/indigo with a warm gold accent. Leans into the tarot-parlor fantasy.",
    fontVar: "var(--preview-font-mystic)",
    vars: {
      "--color-bg": "#1b1330",
      "--color-surface": "#241a3d",
      "--color-surface-raised": "#2e2249",
      "--color-text": "#f5f1ff",
      "--color-text-muted": "#b6a9d6",
      "--color-accent": "#d9a441",
      "--color-accent-2": "#7c5cff",
      "--color-border": "#3b2c5e",
    } as React.CSSProperties,
  },
  {
    name: "Sunlit Cottage",
    blurb:
      "Warm cream/terracotta/sage. Leans into 'cozy cat cafe' over 'mystic parlor'.",
    fontVar: "var(--preview-font-cottage)",
    vars: {
      "--color-bg": "#faf3e8",
      "--color-surface": "#ffffff",
      "--color-surface-raised": "#fff8ee",
      "--color-text": "#3a2e22",
      "--color-text-muted": "#8a7968",
      "--color-accent": "#c1694f",
      "--color-accent-2": "#7c9473",
      "--color-border": "#e6d8c3",
    } as React.CSSProperties,
  },
  {
    name: "Moonlit Pastel",
    blurb:
      "Soft lavender/blush with a periwinkle accent. A whimsical middle ground.",
    fontVar: "var(--preview-font-pastel)",
    vars: {
      "--color-bg": "#f3eefc",
      "--color-surface": "#ffffff",
      "--color-surface-raised": "#faf6ff",
      "--color-text": "#332b4d",
      "--color-text-muted": "#6f6590",
      "--color-accent": "#8b7cf6",
      "--color-accent-2": "#f4a6c6",
      "--color-border": "#e2d7f7",
    } as React.CSSProperties,
  },
];

function MoodPanel({ mood }: { mood: Mood }) {
  return (
    <section
      style={{
        ...mood.vars,
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text)",
        borderColor: "var(--color-border)",
      }}
      className="rounded-lg border p-8 flex flex-col gap-6"
    >
      <div>
        <p className="text-sm uppercase tracking-wide text-[var(--color-text-muted)]">
          {mood.name}
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {mood.blurb}
        </p>
      </div>

      <h2
        style={{ fontFamily: mood.fontVar }}
        className="text-3xl leading-snug"
      >
        Mercury retrograde has clogged your cat&apos;s third eye.
      </h2>
      <p className="text-base max-w-prose">
        Your cat is acting weird again — hiding, hissing, knocking things off
        the counter. Take a short quiz and get a whimsical spiritual diagnosis,
        plus a cleansing ritual to try.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          style={{ backgroundColor: "var(--color-accent)" }}
          className="rounded-md px-4 py-2 font-medium text-[var(--color-bg)]"
        >
          Take the quiz
        </button>
        <button
          style={{
            borderColor: "var(--color-accent)",
            color: "var(--color-accent)",
          }}
          className="rounded-md border px-4 py-2 font-medium"
        >
          View history
        </button>
      </div>

      <div
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
        className="rounded-md border p-4"
      >
        <p className="text-sm text-[var(--color-text-muted)]">Whiskers</p>
        <p className="font-medium">Added 3 days ago</p>
      </div>

      <div
        style={{
          backgroundColor: "var(--color-surface-raised)",
          borderColor: "var(--color-accent-2)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        }}
        className="rounded-lg border-2 p-6"
      >
        <p
          className="text-xs uppercase tracking-widest"
          style={{ color: "var(--color-accent-2)" }}
        >
          Diagnosis
        </p>
        <h3 style={{ fontFamily: mood.fontVar }} className="text-2xl mt-1 mb-2">
          Residual energy from the vacuum cleaner
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Ritual: a moonlight nap spot, blessed with a lint-roller smudge stick.
        </p>
      </div>
    </section>
  );
}

export default function DesignPreviewPage() {
  return (
    <main
      className={`${cormorant.variable} ${fraunces.variable} ${baloo.variable} max-w-3xl mx-auto px-4 py-10 flex flex-col gap-10`}
    >
      <div>
        <h1 className="text-2xl font-semibold">Design preview</h1>
        <p className="text-sm text-gray-600">
          Phase 10 style tile — three palette/type directions rendered against
          real UI fragments (button, card, and the diagnosis card shape). Not
          linked from the site nav; scratch page, removed once a direction is
          picked in docs/design-system.md.
        </p>
      </div>
      {moods.map((mood) => (
        <MoodPanel key={mood.name} mood={mood} />
      ))}
    </main>
  );
}
