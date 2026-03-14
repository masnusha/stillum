import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_PATHS = new Set(["/login", "/login/check-email"]);

/**
 * Edge middleware — fast cookie-based auth gate.
 * Runs before any page is rendered; works with next-auth v4 database sessions.
 *
 * next-auth v4 sets a session-token cookie whose presence we check here.
 * The full session validity is still verified server-side in the layout.
 */
// Next.js 16 renamed "middleware" to "proxy". Export must be named "proxy".
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pass through: public pages, API routes, and Next.js internals
  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/")
  ) {
    return NextResponse.next();
  }

  // next-auth v4 session cookie name differs by environment
  const sessionCookie =
    process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

  if (!req.cookies.has(sessionCookie)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except static files and images
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
