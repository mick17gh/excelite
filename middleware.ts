import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/","/login", "/forgot-password", "/reset-password", "/auth/reset-password", "/api/auth", "/api/v1"];
const authRoutes = ["/login", "/forgot-password", "/reset-password"];

function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Optional hosting mode: hide landing page and force sign-in.
  // When enabled, requesting "/" redirects to "/login" (or "/dashboard" if already signed in).
  const hideLanding = isTruthyEnv(process.env.NEXT_PUBLIC_HIDE_LANDING_PAGE);

  if (hideLanding && pathname === "/") {
    const sessionCookie = request.cookies.get("better-auth.session_token");
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", "/");
    return NextResponse.redirect(loginUrl);
  }

  // Allow public routes and API auth routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get("better-auth.session_token");

  // If no session and trying to access protected route, redirect to login
  if (!sessionCookie && !authRoutes.some((route) => pathname.startsWith(route))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If has session and trying to access auth routes, redirect to dashboard
  if (sessionCookie && authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
