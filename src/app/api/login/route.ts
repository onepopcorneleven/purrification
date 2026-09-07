import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Same "invalid email or password" response whether the account doesn't
  // exist or the password is wrong — don't leak which emails are registered.
  const invalidCredentials = NextResponse.json(
    { error: "Invalid email or password." },
    { status: 401 },
  );
  if (!user) return invalidCredentials;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return invalidCredentials;

  const response = NextResponse.json({
    user: { id: user.id, email: user.email },
  });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
