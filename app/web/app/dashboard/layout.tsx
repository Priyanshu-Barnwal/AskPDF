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
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-all duration-300 group-hover:border-white/30 group-hover:bg-white/15">
              <span className="text-sm">📄</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-white/90">
              AskPDF
            </span>
          </Link>

          {/* Right side: nav links + user button */}
          <div className="flex items-center gap-6">
            <nav className="hidden items-center gap-5 md:flex">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-white/60 transition-colors duration-200 hover:text-white"
              >
                My Documents
              </Link>
              <Link
                href="/dashboard/chat"
                className="text-sm font-medium text-white/60 transition-colors duration-200 hover:text-white"
              >
                Chat
              </Link>
            </nav>

            <UserButton
              appearance={{
                elements: {
                  avatarBox:
                    "h-8 w-8 rounded-full border border-white/[0.2] ring-0 transition-all duration-300 hover:border-white/[0.35]",
                  userButtonPopoverCard:
                    "bg-[#0d0d0d] border border-white/[0.08] backdrop-blur-md rounded-2xl shadow-xl",
                  userButtonPopoverActionButton:
                    "text-white/70 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all duration-300",
                  userButtonPopoverActionButtonText: "font-medium",
                  userButtonPopoverFooter: "border-t border-white/[0.06]",
                },
              }}
            />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
