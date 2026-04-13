"use client";

import { useAuth } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

/**
 * NavbarAuthSection — Client Component
 * Renders either auth buttons (signed out) or UserButton (signed in).
 * Kept separate so Navbar.tsx stays a Server Component.
 */
export function NavbarAuthSection() {
  const { isSignedIn, isLoaded } = useAuth();

  // Render a skeleton pill while Clerk hydrates to avoid layout shift
  if (!isLoaded) {
    return (
      <div className="h-9 w-32 animate-pulse rounded-full border border-white/[0.08] bg-white/[0.04]" />
    );
  }

  if (isSignedIn) {
    return (
      <UserButton
        appearance={{
          elements: {
            avatarBox:
              "h-9 w-9 rounded-full border border-white/[0.2] ring-0 transition-all duration-300 hover:border-white/[0.35]",
            userButtonPopoverCard:
              "bg-[#0d0d0d] border border-white/[0.08] backdrop-blur-md rounded-2xl shadow-xl",
            userButtonPopoverActionButton:
              "text-white/70 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all duration-300",
            userButtonPopoverActionButtonText: "font-medium",
            userButtonPopoverFooter: "border-t border-white/[0.06]",
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
