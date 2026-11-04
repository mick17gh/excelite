import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { REQUEST_PATHNAME_COOKIE } from "@/lib/permissions/constants";
import {
  isHideLandingPage,
  isStorefrontOnlyPath,
  isStorefrontSurface,
} from "@/lib/storefront/surface";

const publicRoutes = [
  "/",
  "/demo",
  "/faq",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/reset-password",
  "/api/auth",
  "/api/v1",
  "/api/public",
  "/checkout",
  "/order",
  "/track",
];
const authRoutes = ["/login", "/forgot-password", "/reset-password"];

/** better-auth session cookies (incl. secure prefix on HTTPS). */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => {
    const name = cookie.name;
    return (
      name === "better-auth.session_token" ||
      name === "__Secure-better-auth.session_token" ||
      name === "better-auth.session_data" ||
      name === "__Secure-better-auth.session_data"
    );
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Optional hosting mode: hide landing page and force sign-in.
  // When enabled, requesting "/" redirects to "/login" (or "/dashboard" if already signed in).
  // Also blocks storefront-only paths (overrides APP_SURFACE=storefront).
  const hideLanding = isHideLandingPage();

  if (hideLanding && pathname === "/") {
    if (hasSessionCookie(request)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", "/");
    return NextResponse.redirect(loginUrl);
  }

  if (isStorefrontOnlyPath(pathname) && (hideLanding || !isStorefrontSurface())) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Allow public routes and API auth routes
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }

  const hasSession = hasSessionCookie(request);

  // If no session and trying to access protected route, redirect to login
  if (!hasSession && !authRoutes.some((route) => pathname.startsWith(route))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If has session and trying to access auth routes, send to app entry (dashboard resolves onboarding)
  if (hasSession && authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-url", request.url);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.cookies.set(REQUEST_PATHNAME_COOKIE, pathname, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
