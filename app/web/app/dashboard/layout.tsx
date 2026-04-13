import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080808] font-sans">
      {/* Slim dashboard top bar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/60 px-6 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Logo — in the dashboard the logo always stays on /dashboard */}
          <Link href="/dashboard" className="group flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-all duration-300 group-hover:border-white/30 group-hover:bg-white/15">
              <span className="text-sm">📄</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-white/90">
              AskPDF
            </span>
          </Link>

          {/* Right side: UserButton only (nav links removed per design) */}
          <UserButton />
        </div>
      </header>

      {children}
    </div>
  );
}
