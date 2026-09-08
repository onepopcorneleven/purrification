import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";

/** Reads and verifies the session cookie for the current request. Returns
 * the user id, or null if there's no valid session — never throws. */
export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token)?.userId ?? null;
}

// Temporary tester/reviewer convenience: with DISABLE_AUTH=true, anyone
// with no session cookie is treated as this pinned user (erika@erika.erika)
// instead of being sent to /login. Logging in as yourself still works
// normally on top of this. Never set DISABLE_AUTH in .env.production —
// this must not reach the live site.
const DISABLE_AUTH_USER_ID = "cmtrjbo760005ddeptg5o7w4i";

/** Loads the logged-in user for the current request, or null if signed out.
 * The guard for protected pages/Server Components (`redirect("/login")` on
 * null) and Route Handlers (respond 401 on null) alike. */
export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) {
    if (process.env.DISABLE_AUTH === "true") {
      return prisma.user.findUnique({ where: { id: DISABLE_AUTH_USER_ID } });
    }
    return null;
  }
  return prisma.user.findUnique({ where: { id: userId } });
}
