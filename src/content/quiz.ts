// The quiz question bank (R-QUIZ-2). Content is edited by committing here,
// not through an admin CMS (see product-brief.md's out-of-scope list) — this
// file *is* the content-editing surface.

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

export const quizQuestions: QuizQuestion[] = [
  {
    id: "mood",
    prompt: "How's your cat's mood been lately?",
    options: [
      { id: "chill", label: "Suspiciously chill" },
      { id: "hyper", label: "Zooming around at 3am" },
      { id: "aloof", label: "Ignoring you on principle" },
      { id: "dramatic", label: "Emotionally unavailable" },
    ],
  },
  {
    id: "napSpot",
    prompt: "Where has your cat been napping most?",
    options: [
      { id: "sunbeam", label: "In a sunbeam, like royalty" },
      { id: "box", label: "A cardboard box that's too small" },
      { id: "laptop", label: "Directly on your keyboard" },
      { id: "weird", label: "Somewhere structurally inexplicable" },
    ],
  },
  {
    id: "homeChanges",
    prompt: "Any new objects or changes in the home recently?",
    options: [
      { id: "furniture", label: "New furniture" },
      { id: "vacuum", label: "The vacuum cleaner came out" },
      { id: "guest", label: "A guest visited" },
      { id: "nothing", label: "Nothing's changed" },
    ],
  },
  {
    id: "mealtime",
    prompt: "How's mealtime going?",
    options: [
      { id: "normal", label: "Business as usual" },
      { id: "picky", label: "Suddenly picky" },
      { id: "begging", label: "Begging like it's never been fed" },
      { id: "ignoring", label: "Ignoring the bowl entirely" },
    ],
  },
  {
    id: "vocalizing",
    prompt: "Any unusual vocalizing?",
    options: [
      { id: "silent", label: "Total silence" },
      { id: "chatty", label: "Extra chatty" },
      { id: "yowling", label: "Yowling at 3am for no reason" },
      { id: "hissing", label: "Hissing at an empty corner" },
    ],
  },
];
