// Drop into tailwind.config.ts under theme.extend
// Mirrors design-tokens.json — keep both in sync if values change.

const purrificationTheme = {
  extend: {
    colors: {
      bg: {
        base: "#0D0A12",
        raised: "#1A1424",
        elevated: "#241B33",
      },
      burgundy: {
        50: "#F5E4EC", 300: "#C46E92", 500: "#7A2048", 700: "#5A1836", 900: "#3A0F23",
      },
      emerald: {
        50: "#E1F3EA", 300: "#5FAF8B", 500: "#1F6B4E", 700: "#164E39", 900: "#0E3225",
      },
      midnight: {
        50: "#E3E8F5", 300: "#6577A8", 500: "#2B3A67", 700: "#1F2B4C", 900: "#141C31",
      },
      gold: {
        50: "#FBF3DD", 300: "#E8C766", 500: "#D4AF37", 700: "#B8933F", 900: "#7A611F",
      },
      text: {
        primary: "#F3E9D8",
        secondary: "#C9BBA8",
        muted: "#8A7F72",
      },
      success: "#2E8F6B",
      error: "#C1443A",
      warning: "#D9A441",
      info: "#5C7AA0",
    },
    fontFamily: {
      display: ["'Cinzel Decorative'", "Cinzel", "serif"],
      heading: ["Cinzel", "'Playfair Display'", "serif"],
      body: ["'EB Garamond'", "'Cormorant Garamond'", "Georgia", "serif"],
    },
    borderRadius: {
      sm: "8px",
      md: "16px",
      lg: "24px",
    },
    boxShadow: {
      "glow-gold-sm": "0 0 12px rgba(212, 175, 55, 0.18)",
      "glow-gold-md": "0 0 24px rgba(212, 175, 55, 0.28)",
      "glow-gold-lg": "0 0 40px rgba(212, 175, 55, 0.35)",
      "glow-purple": "0 0 30px rgba(122, 32, 72, 0.4)",
    },
    transitionTimingFunction: {
      dreamy: "cubic-bezier(0.19, 1, 0.22, 1)",
    },
  },
};

export default purrificationTheme;

/*
Usage examples once merged into tailwind.config.ts:

<div className="bg-bg-base text-text-primary font-body">
  <h1 className="font-heading text-gold-500 text-4xl">Purrification</h1>
  <button className="bg-gold-500 text-bg-elevated rounded-full px-6 py-3
                      shadow-glow-gold-sm hover:shadow-glow-gold-md
                      transition-shadow duration-300 ease-dreamy">
    Begin the Ritual
  </button>
</div>
*/
