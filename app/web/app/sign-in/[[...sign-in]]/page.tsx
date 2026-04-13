import { SignIn } from "@clerk/nextjs";
import { GlowCanvas } from "@/components/GlowCanvas";

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#080808]">
      {/* Ambient glow background — matches landing page */}
      <GlowCanvas />

      {/* Subtle grid overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      {/* Logo wordmark */}
      <a
        href="/"
        className="group relative z-10 mb-10 flex items-center gap-2.5 transition-opacity duration-300 hover:opacity-70"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-all duration-300 group-hover:border-white/30 group-hover:bg-white/15">
          <span className="text-base">📄</span>
        </div>
        <span className="text-sm font-semibold tracking-tight text-white/90">
          AskPDF
        </span>
      </a>

      {/* Clerk SignIn card — inherits appearance from ClerkProvider in layout */}
      <div className="relative z-10 w-full max-w-md px-4">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/dashboard"
        />
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-xs text-white/20">
        © {new Date().getFullYear()} AskPDF. All rights reserved.
      </p>
    </main>
  );
}
