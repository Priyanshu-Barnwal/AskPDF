"use client";

import { useAuth } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

/**
 * NavbarAuthSection — Client Component
 *
 * - Signed out  →  "Sign In" (ghost) + "Get Started Free" (solid white)
 * - Signed in   →  Clerk <UserButton> avatar
 *
 * Logo href is also auth-aware: /dashboard when signed in, / when signed out.
 * This component is rendered inside Navbar (Server Component) as the only
 * client boundary, keeping the rest of the Navbar tree server-side.
 */
export function NavbarAuthSection() {
  const { isSignedIn, isLoaded } = useAuth();

  // Render a skeleton pill while Clerk hydrates to avoid layout shift
  if (!isLoaded) {
    return (
      <div className="flex items-center gap-3">
        {/* Logo skeleton */}
        <div className="h-9 w-9 animate-pulse rounded-full border border-white/[0.08] bg-white/[0.04]" />
        {/* CTA skeleton */}
        <div className="h-9 w-32 animate-pulse rounded-full border border-white/[0.08] bg-white/[0.04]" />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <UserButton
        appearance={{
          elements: {
            avatarBox:
              "h-9 w-9 rounded-full border border-white/[0.2] ring-0 transition-all duration-300 hover:border-white/[0.35]",
          },
        }}
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/sign-in"
        className="rounded-full border border-white/[0.12] bg-white/[0.04] px-5 py-2 text-sm font-medium text-white/80 transition-all duration-300 hover:bg-white/[0.08] hover:text-white hover:border-white/[0.2]"
      >
        Sign In
      </Link>
      <Link
        href="/sign-up"
        className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-all duration-300 hover:bg-white/90 hover:shadow-[0_0_24px_rgba(255,255,255,0.12)]"
      >
        Get Started Free
      </Link>
    </div>
  );
}

/**
 * NavbarLogo — Client Component
 * Renders the AskPDF logo with an auth-aware href:
 *   signed in  → /dashboard
 *   signed out → /
 */
export function NavbarLogo() {
  const { isSignedIn, isLoaded } = useAuth();

  const href = isLoaded && isSignedIn ? "/dashboard" : "/";

  return (
    <Link href={href} className="flex items-center gap-2.5 group">
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-all duration-300 group-hover:border-white/30 group-hover:bg-white/15">
        <span className="text-base">📄</span>
      </div>
      <span className="text-sm font-semibold text-white/90 tracking-tight">AskPDF</span>
    </Link>
  );
}
