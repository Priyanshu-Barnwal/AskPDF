// components/Hero.tsx
// Hero section — custom-vibe skill §4.3, adapted for AskPDF
import { Button } from "@/components/ui/button";
import { GlowCanvas } from "./GlowCanvas";

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      <GlowCanvas />

      {/* Announcement badge */}
      <div
        className="animate-[fadeUp_0.6s_ease_forwards] mb-8 flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-4 py-2 backdrop-blur-sm"
        style={{ animationDelay: "0ms" }}
      >
        <span className="h-2 w-2 rounded-full bg-[#5a7c60] animate-pulse" />
        <span className="text-sm font-medium text-white/80">
          Now in Beta — Try AskPDF for free
        </span>
        <span className="text-white/40">→</span>
      </div>

      {/* Headline */}
      <h1
        className="animate-[fadeUp_0.6s_ease_forwards] max-w-3xl text-center text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl"
        style={{ animationDelay: "100ms", opacity: 0 }}
      >
        Upload a PDF.{" "}
        <span className="bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">
          Ask anything.
        </span>
      </h1>

      {/* Subtitle */}
      <p
        className="animate-[fadeUp_0.6s_ease_forwards] mt-6 max-w-xl text-center text-base text-white/45 md:text-lg"
        style={{ animationDelay: "200ms", opacity: 0 }}
      >
        AskPDF parses, chunks, and embeds your documents so you can ask
        natural language questions and get accurate, grounded answers.
      </p>

      {/* CTA buttons */}
      <div
        className="animate-[fadeUp_0.6s_ease_forwards] mt-10 flex items-center gap-4"
        style={{ animationDelay: "300ms", opacity: 0 }}
      >
        <Button className="rounded-full border border-white/[0.12] bg-white/[0.06] px-6 py-2.5 text-sm font-medium text-white hover:bg-white/[0.1] hover:shadow-[0_0_24px_rgba(255,255,255,0.08)] transition-all duration-300">
          Upload a Document ↗
        </Button>
        <Button className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black hover:bg-white/90 hover:shadow-[0_0_32px_rgba(255,255,255,0.2)] transition-all duration-300">
          See How It Works
        </Button>
      </div>

      {/* Floating stat pins — left */}
      <StatPin label="Accuracy Rate" value="94.7%" className="absolute left-12 top-1/3 hidden lg:flex" />
      <StatPin label="Active Users" value="3,800+" className="absolute left-12 bottom-1/3 hidden lg:flex" />

      {/* Floating stat pins — right */}
      <StatPin label="Documents Processed" value="1,204" className="absolute right-12 top-1/3 hidden lg:flex" />
      <StatPin label="Avg Response Time" value="1.2s" className="absolute right-12 bottom-1/3 hidden lg:flex" />

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-8 flex items-center gap-3 text-xs text-white/40">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06]">
          ↓
        </div>
        01 · Scroll down
      </div>

      {/* Corner label */}
      <div className="absolute bottom-8 right-8 text-right">
        <p className="text-xs font-medium text-white/60">RAG · PDF · AI</p>
        <div className="mt-1 h-px w-8 bg-white/30 ml-auto" />
      </div>
    </section>
  );
}

function StatPin({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-medium uppercase tracking-widest text-white/35">
        {label}
      </span>
      <span className="text-sm font-semibold text-white/80">• {value}</span>
    </div>
  );
}
