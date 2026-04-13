import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that do NOT require authentication
const isPublicRoute = createRouteMatcher([
  "/",                        // Landing page
  "/sign-in(.*)",             // Clerk sign-in (catch-all)
  "/sign-up(.*)",             // Clerk sign-up (catch-all)
  "/_next/(.*)",              // Next.js internals
  "/favicon.ico",
  "/public(.*)",              // Static public assets
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // Redirect unauthenticated users to /sign-in
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Run on everything except static file extensions
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
