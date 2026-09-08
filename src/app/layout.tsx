import type { Metadata } from "next";
import { Cinzel_Decorative, Cinzel, EB_Garamond } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

// Three-tier brand type system — see docs/design/purrification-brand-guidelines.md §5.
const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-decorative",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Purrification",
  description:
    "A whimsical spiritual diagnosis and cleansing ritual for your cat's weird behavior.",
  icons: {
    icon: "/icons/favicon.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cinzelDecorative.variable} ${cinzel.variable} ${ebGaramond.variable}`}
    >
      <body>
        <div className="app-atmosphere" aria-hidden="true" />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
