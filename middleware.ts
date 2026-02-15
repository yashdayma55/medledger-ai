import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "medledger_session";
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "medledger-dev-secret-change-in-production"
);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    let loginUrl = "/auth/patient";
    if (path.startsWith("/dashboard/patient")) loginUrl = "/auth/login/patient";
    else if (path.startsWith("/dashboard/doctor")) loginUrl = "/auth/login/doctor";
    else if (path.startsWith("/dashboard/admin")) loginUrl = "/auth/admin";
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    let loginUrl = "/auth/login/patient";
    if (path.startsWith("/dashboard/doctor")) loginUrl = "/auth/login/doctor";
    else if (path.startsWith("/dashboard/admin")) loginUrl = "/auth/admin";
    const res = NextResponse.redirect(new URL(loginUrl, request.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
