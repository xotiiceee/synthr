import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const { nextUrl } = req;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
  const isSetupComplete = token?.setupComplete as boolean;

  const isAuthRoute = nextUrl.pathname.startsWith("/auth");
  const isSetupRoute = nextUrl.pathname.startsWith("/setup");
  const isApiRoute = nextUrl.pathname.startsWith("/api");
  const isPublicRoute = isAuthRoute || isApiRoute;

  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/signin", nextUrl));
  }

  if (isLoggedIn && !isSetupComplete && !isSetupRoute && !isAuthRoute) {
    return NextResponse.redirect(new URL("/setup", nextUrl));
  }

  if (isLoggedIn && isSetupComplete && isSetupRoute) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)"],
};
