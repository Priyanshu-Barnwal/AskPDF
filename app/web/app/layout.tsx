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
    // Backgrounds
    colorBackground: "#0d0d0d",
    colorInputBackground: "rgba(255,255,255,0.04)",
    // Text
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.45)",
    colorTextOnPrimaryBackground: "#0a0a0a",
    // Brand / primary action = white (our solid CTA style)
    colorPrimary: "#ffffff",
    // Danger
    colorDanger: "oklch(0.704 0.191 22.216)",
    // Borders
    colorInputText: "#ffffff",
    // Border radius — match card: rounded-2xl = 16px, buttons: rounded-full
    borderRadius: "12px",
    // Font
    fontFamily: "Inter, system-ui, sans-serif",
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 700,
    },
  },
  elements: {
    // Card / modal container — our glass card style
    card: "bg-white/[0.04] backdrop-blur-md border border-white/[0.08] shadow-none rounded-2xl",
    // Header
    headerTitle: "text-white font-bold tracking-tight",
    headerSubtitle: "text-white/45",
    // Social button (OAuth)
    socialButtonsBlockButton:
      "border border-white/[0.12] bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:border-white/[0.2] rounded-full transition-all duration-300",
    socialButtonsBlockButtonText: "text-white/80 font-medium",
    // Divider
    dividerLine: "bg-white/[0.08]",
    dividerText: "text-white/25 text-xs",
    // Form fields
    formFieldLabel: "text-white/60 text-xs font-medium uppercase tracking-widest",
    formFieldInput:
      "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 rounded-xl focus:border-white/[0.2] focus:ring-0 transition-all duration-300",
    // Primary button (submit) — solid white, black text
    formButtonPrimary:
      "bg-white text-black font-semibold rounded-full hover:bg-white/90 hover:shadow-[0_0_24px_rgba(255,255,255,0.12)] transition-all duration-300",
    // Footer links
    footerActionLink: "text-white/70 hover:text-white transition-colors duration-300",
    footerActionText: "text-white/45",
    // Internal nav links (e.g. "Back")
    identityPreviewText: "text-white/70",
    identityPreviewEditButtonIcon: "text-white/40",
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
