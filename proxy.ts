import { clerkMiddleware } from "@clerk/nextjs/server";

const publicPaths = [
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
].filter((path): path is string => Boolean(path));

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// Everything except the auth pages requires a session.
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicPath(req.nextUrl.pathname)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
