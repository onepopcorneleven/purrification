import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/guard";
import { Mark } from "./Mark";
import { LogoutButton } from "./LogoutButton";
import { TextLink } from "./TextLink";
import { OrnamentalRule } from "./OrnamentalRule";

type User = Awaited<ReturnType<typeof getCurrentUser>>;

type PageShellProps = {
  children: ReactNode;
  /** Pass the already-fetched user to avoid a second getCurrentUser() call
   * on pages that already guard themselves; omit to have PageShell fetch
   * it itself (e.g. on public pages like the landing or share page). */
  user?: User;
  /** Widen `main` for the one true hero moment (the landing page's
   * photographic header) instead of the uniform max-w-3xl every other
   * route uses — WP4's "break the uniform column" (see
   * docs/design-upgrade-round-2.md). Header/footer stay at max-w-3xl on
   * purpose: a hero well that reads slightly wider than the chrome above
   * it is a deliberate bit of rhythm, not a layout bug. */
  wide?: boolean;
};

/** Header (wordmark + auth-aware nav) and footer (persistent disclaimer)
 * around every page — see docs/design-system.md's "Gaps found": no shared
 * shell existed before this. */
export async function PageShell({ children, user, wide }: PageShellProps) {
  const currentUser = user !== undefined ? user : await getCurrentUser();

  return (
    <div className="relative flex min-h-screen flex-col">
      <header>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4">
          <Link
            href={currentUser ? "/cats" : "/"}
            className="flex items-center gap-2.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
          >
            <span className="wordmark-glow">
              <Mark size={28} />
            </span>
            <span className="font-heading text-lg tracking-wide text-text-primary">
              Purrification
            </span>
          </Link>
          <nav className="flex items-center gap-5 font-ui text-sm text-text-secondary">
            {currentUser ? (
              <>
                <TextLink
                  href="/cats"
                  className="nav-link hover:text-gold-300"
                >
                  My cats
                </TextLink>
                <LogoutButton />
              </>
            ) : (
              <>
                <TextLink
                  href="/login"
                  className="nav-link hover:text-gold-300"
                >
                  Log in
                </TextLink>
                <TextLink
                  href="/signup"
                  className="nav-link hover:text-gold-300"
                >
                  Sign up
                </TextLink>
              </>
            )}
          </nav>
        </div>
        <OrnamentalRule />
      </header>

      <main
        className={`mx-auto w-full flex-1 px-4 py-10 ${wide ? "max-w-4xl" : "max-w-3xl"}`}
      >
        {children}
      </main>

      <footer>
        <OrnamentalRule />
        <p className="mx-auto max-w-3xl px-4 py-6 text-center text-xs text-text-muted">
          Purrification is just for fun — not real medical or behavioral advice.
          If your cat is genuinely unwell, please see a vet.
        </p>
      </footer>
    </div>
  );
}
