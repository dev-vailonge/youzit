import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If user is signed in and the current path is /signin
  if (session && req.nextUrl.pathname === "/signin") {
    return NextResponse.redirect(new URL("/prompt", req.url));
  }

  // If user is not signed in and the current path is /prompt
  if (!session && req.nextUrl.pathname === "/prompt") {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/signin", "/prompt"],
};
