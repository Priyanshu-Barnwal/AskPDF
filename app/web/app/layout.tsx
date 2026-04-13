import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "AskPDF — Chat with your PDFs",
  description:
    "Upload a PDF and ask anything. AskPDF uses RAG to parse, chunk, embed, and answer natural language questions about your documents.",
};

/**
 * Clerk appearance variables that mirror the custom-vibe design system.
 * These override Clerk's default card/form colors to match our #080808 palette.
 */
const clerkAppearance = {
  variables: {
    // ── Backgrounds ───────────────────────────────────────────────────────────
    colorBackground: "#0d0d0d",
    colorInputBackground: "rgba(255,255,255,0.06)",
    // ── Text ─────────────────────────────────────────────────────────────────
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.50)",
    colorTextOnPrimaryBackground: "#0a0a0a",
    // colorNeutral drives the entire greyscale Clerk uses internally
    // (labels, muted text, borders, placeholder, icons).
    // Setting it to white makes all those shades white-derived instead of black-derived.
    colorNeutral: "#ffffff",
    // ── Brand / Primary ───────────────────────────────────────────────────────
    colorPrimary: "#ffffff",
    // ── Danger ────────────────────────────────────────────────────────────────
    colorDanger: "#f87171",
    // ── Input ─────────────────────────────────────────────────────────────────
    colorInputText: "#ffffff",
    // ── Borders & Radius ──────────────────────────────────────────────────────
    borderRadius: "12px",
    // ── Typography ────────────────────────────────────────────────────────────
    fontFamily: "Inter, system-ui, sans-serif",
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 700,
    },
  },
  elements: {
    // ── Card container ────────────────────────────────────────────────────────
    // Use a solid dark background so Clerk's own internal text (which references
    // colorBackground) stays legible — pure transparent breaks Clerk's contrast calc.
    card: "!bg-[#111111] border border-white/[0.08] shadow-none rounded-2xl backdrop-blur-md",
    cardBox: "shadow-none",
    // ── Header ────────────────────────────────────────────────────────────────
    headerTitle: "!text-white font-bold tracking-tight",
    headerSubtitle: "!text-white/50",
    // ── Social / OAuth buttons ────────────────────────────────────────────────
    socialButtonsBlockButton:
      "!border !border-white/[0.12] !bg-white/[0.05] !text-white/80 hover:!bg-white/[0.10] hover:!border-white/[0.22] rounded-full transition-all duration-300",
    socialButtonsBlockButtonText: "!text-white/80 font-medium",
    socialButtonsBlockButtonArrow: "!text-white/40",
    // ── Divider ───────────────────────────────────────────────────────────────
    dividerLine: "!bg-white/[0.08]",
    dividerText: "!text-white/30 text-xs",
    // ── Form labels & inputs ──────────────────────────────────────────────────
    formFieldLabel: "!text-white/55 text-xs font-medium uppercase tracking-widest",
    formFieldInput:
      "!bg-white/[0.05] !border !border-white/[0.10] !text-white placeholder:!text-white/25 rounded-xl focus:!border-white/[0.25] focus:!ring-0 transition-all duration-300",
    formFieldInputShowPasswordButton: "!text-white/40 hover:!text-white/70",
    formFieldErrorText: "!text-red-400",
    formFieldSuccessText: "!text-green-400",
    // ── Primary submit button ─────────────────────────────────────────────────
    formButtonPrimary:
      "!bg-white !text-black font-semibold rounded-full hover:!bg-white/90 hover:shadow-[0_0_24px_rgba(255,255,255,0.12)] transition-all duration-300",
    // ── Footer ("Don't have an account? Sign up") ─────────────────────────────
    footer: "!bg-transparent",
    footerAction: "!bg-transparent",
    footerActionText: "!text-white/45",
    footerActionLink: "!text-white/70 hover:!text-white transition-colors duration-300",
    // ── User popover (UserButton dropdown) ───────────────────────────────────
    // This renders in a portal — needs its own explicit dark bg
    userButtonPopoverCard:
      "!bg-[#111111] !border !border-white/[0.08] backdrop-blur-md rounded-2xl shadow-xl",
    userButtonPopoverActions: "!bg-transparent",
    userButtonPopoverActionButton:
      "!text-white/70 hover:!text-white hover:!bg-white/[0.06] rounded-lg transition-all duration-300",
    userButtonPopoverActionButtonText: "!text-white/70 font-medium",
    userButtonPopoverActionButtonIcon: "!text-white/40",
    userButtonPopoverFooter: "!border-t !border-white/[0.06] !bg-transparent",
    userPreviewMainIdentifier: "!text-white font-medium",
    userPreviewSecondaryIdentifier: "!text-white/45",
    // ── Avatar ────────────────────────────────────────────────────────────────
    avatarBox:
      "rounded-full border border-white/[0.2] ring-0 transition-all duration-300 hover:border-white/[0.35]",
    // ── Internal nav (e.g. "Back", identity preview) ──────────────────────────
    identityPreviewText: "!text-white/70",
    identityPreviewEditButtonIcon: "!text-white/40",
    // ── Badge ─────────────────────────────────────────────────────────────────
    badge: "!bg-white/[0.06] !text-white/60 border !border-white/[0.08]",
    // ── UserProfile modal (Manage Account) ────────────────────────────────────
    // The modal renders in a portal with its own background hierarchy
    userProfile__backdrop: "!bg-black/70 backdrop-blur-sm",
    // Outer modal shell
    modalContent: "!bg-[#0d0d0d] !border !border-white/[0.08] rounded-3xl shadow-2xl",
    modalCloseButton: "!text-white/50 hover:!text-white hover:!bg-white/[0.06] rounded-lg",
    // Left sidebar
    userProfileNavbarItem:
      "!text-white/60 hover:!text-white hover:!bg-white/[0.05] rounded-lg transition-all duration-200",
    userProfileNavbarItem__active: "!bg-white/[0.06] !text-white",
    // Page body (right panel)
    userProfilePage: "!bg-transparent",
    userProfileSection: "!border-b !border-white/[0.06]",
    userProfileSectionHeaderTitle: "!text-white font-semibold",
    userProfileSectionHeaderSubtitle: "!text-white/45",
    // Section content rows
    profileSectionItem: "!border-b !border-white/[0.05]",
    profileSectionItemPropertyLabel: "!text-white/55 text-xs uppercase tracking-widest font-medium",
    profileSectionItemPropertyValue: "!text-white/80",
    // Action / secondary buttons inside modal
    formButtonReset:
      "!border !border-white/[0.12] !bg-white/[0.04] !text-white/70 hover:!bg-white/[0.08] hover:!text-white rounded-full transition-all duration-300",
    // Accordion / rows
    accordionTriggerButton: "!text-white/70 hover:!text-white",
    // Page titles
    pageTitle: "!text-white font-bold tracking-tight",
    pageScrollBox: "!bg-transparent",
    // Navbar (left rail)
    navbar: "!bg-[#111111] !border-r !border-white/[0.06]",
    navbarButton: "!text-white/60 hover:!text-white hover:!bg-white/[0.05] rounded-lg",
    navbarMobileMenuButton: "!text-white/60",
    // Scrollable content area
    scrollBox: "!bg-transparent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" className="dark">
        <body className="antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
