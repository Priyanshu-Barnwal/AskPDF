// components/BrandStrip.tsx
// Tech-stack trust strip — custom-vibe skill §4.4, adapted for AskPDF
const stack = [
  { icon: "▲", label: "Next.js" },
  { icon: "🐍", label: "Python" },
  { icon: "🐘", label: "PostgreSQL" },
  { icon: "🧠", label: "OpenAI" },
  { icon: "☁", label: "AWS S3" },
  { icon: "🔷", label: "pgvector" },
  { icon: "⚡", label: "Drizzle ORM" },
];

export function BrandStrip() {
  return (
    <div className="border-t border-white/[0.06] bg-black py-8">
      <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-white/25">
        Powered by
      </p>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 px-6">
        {stack.map(({ icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-2 text-sm font-medium text-white/30 transition-colors duration-300 hover:text-white/60"
          >
            <span className="text-base">{icon}</span>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
