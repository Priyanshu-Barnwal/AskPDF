import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#080808]">
      {/* Ambient glow blobs — same intensity as landing page */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Top-right sage green blob */}
        <div className="absolute -top-40 -right-20 h-[700px] w-[900px] rounded-full bg-[radial-gradient(ellipse,#5a7c6066_0%,transparent_60%)] blur-3xl" />
        {/* Bottom-left warm blob */}
        <div className="absolute -bottom-20 -left-32 h-[500px] w-[600px] rounded-full bg-[radial-gradient(ellipse,#9ca88a33_0%,transparent_65%)] blur-3xl" />
        {/* Centre glow — illuminates the card from behind */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[700px] rounded-full bg-[radial-gradient(ellipse,#5a7c6022_0%,transparent_70%)] blur-3xl" />
      </div>

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
          forceRedirectUrl="/dashboard"
        />
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-xs text-white/20">
        © {new Date().getFullYear()} AskPDF. All rights reserved.
      </p>
    </main>
  );
}
