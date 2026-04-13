// components/Navbar.tsx
// Fixed glassmorphism navbar — custom-vibe skill §4.2, adapted for AskPDF
import { NavbarAuthSection, NavbarLogo } from "@/components/NavbarAuthSection";

const links = [
  { label: "Home", href: "#" },
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">

        {/* Logo — auth-aware href (client component) */}
        <NavbarLogo />

        {/* Nav links pill */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2 backdrop-blur-xl">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/70 transition-all duration-300 hover:bg-white/[0.06] hover:text-white"
            >
              {link.label}
            </a>
          ))}
          {/* Beta badge */}
          <div className="ml-2 flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/80">
            Beta <span className="h-1.5 w-1.5 rounded-full bg-[#5a7c60] animate-pulse" />
          </div>
        </nav>

        {/* Auth section — signs in/out aware (client component) */}
        <NavbarAuthSection />
      </div>
    </header>
  );
}
