<!-- Next.js, Tailwind, Clerk, SSE Streaming -->

---
name: custom-vibe
description: >
  Replicates a premium dark-mode glassmorphism UI aesthetic — deep near-black
  backgrounds, radial glow blobs, hairline glass cards, pill nav, and bold
  display typography — using Tailwind CSS v3/v4 and shadcn/ui components.
  Use this skill whenever the user references this screenshot or asks for a
  "dark crypto / DeFi / glassmorphism" look.
---

# Custom Vibe — Dark Glassmorphism Design System

## 1. Design Token Reference

These tokens were extracted from the reference screenshot. Always use them
as the single source of truth when building in this style.

### 1.1 Color Palette

| Token | Value | Usage |
|---|---|---|
| `background` | `#080808` | Page background |
| `surface-0` | `rgba(255,255,255,0.03)` | Hero canvas / card fill |
| `surface-1` | `rgba(255,255,255,0.06)` | Elevated card / pill |
| `border` | `rgba(255,255,255,0.08)` | Hairline glass borders |
| `border-strong` | `rgba(255,255,255,0.14)` | Focused / hovered borders |
| `text-primary` | `#ffffff` | Headlines, labels |
| `text-secondary` | `rgba(255,255,255,0.45)` | Subtitles, metadata |
| `text-muted` | `rgba(255,255,255,0.25)` | Brand logos, captions |
| `glow-green` | `#5a7c60` (≈ sage) | Primary radial blob colour |
| `glow-warm` | `#9ca88a` | Secondary soft glow |
| `btn-primary-bg` | `#ffffff` | Solid CTA button background |
| `btn-primary-text` | `#0a0a0a` | Solid CTA button text |
| `btn-ghost-bg` | `rgba(0,0,0,0.55)` | Ghost / outline button |
| `btn-ghost-border` | `rgba(255,255,255,0.18)` | Ghost button border |

### 1.2 Typography

| Role | Tailwind class | Notes |
|---|---|---|
| Display / Hero | `text-5xl md:text-7xl font-bold tracking-tight` | White, use `font-[Inter]` or `font-sans` |
| Subtitle | `text-base md:text-lg font-normal text-white/45` | Max width ~60ch |
| Nav label | `text-sm font-medium text-white/70` | Tight letter-spacing |
| Data label | `text-xs font-medium text-white/50 tracking-widest uppercase` | Asset tickers / stats |
| Badge / pill | `text-xs font-semibold` | Inside rounded-full |

Import Google Font **Inter** (weights 400, 500, 600, 700) in `globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

### 1.3 Spacing Scale

The design uses generous, open whitespace.

| Element | Tailwind |
|---|---|
| Section vertical padding | `py-20 md:py-32` |
| Container horizontal padding | `px-6 md:px-12 lg:px-24` |
| Nav padding | `px-4 py-2` (inner pill), `px-6 py-4` (outer bar) |
| Button padding | `px-6 py-2.5` (ghost) · `px-7 py-3` (CTA) |
| Card padding | `p-5` |
| Gap between nav links | `gap-6` |

### 1.4 Border Radius

| Component | Tailwind | px equivalent |
|---|---|---|
| Nav pill container | `rounded-xl` | 12 px |
| Badge / tag | `rounded-full` | 9999 px |
| Button (ghost) | `rounded-full` | 9999 px |
| Button (CTA solid) | `rounded-full` | 9999 px |
| Card | `rounded-2xl` | 16 px |
| Page wrapper (screenshot frame) | `rounded-3xl` | 24 px |

### 1.5 Effects

| Effect | CSS / Tailwind |
|---|---|
| Glass card | `bg-white/[0.04] border border-white/[0.08] backdrop-blur-md` |
| Glow blob | Absolute positioned `div` with `bg-[radial-gradient(ellipse,#5a7c60_0%,transparent_70%)] blur-3xl opacity-40` |
| Subtle noise texture | Optional: `bg-[url('/noise.svg')] bg-repeat opacity-[0.03]` |
| Navbar blur | `backdrop-blur-xl bg-black/40` |
| Text gradient | `bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent` |
| Button hover glow | `hover:shadow-[0_0_24px_rgba(255,255,255,0.12)]` |

---

## 2. Tailwind Config (`tailwind.config.ts`)

Extend Tailwind with the custom tokens so every class maps cleanly:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        background: "#080808",
        surface: {
          0: "rgba(255,255,255,0.03)",
          1: "rgba(255,255,255,0.06)",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.08)",
          strong: "rgba(255,255,255,0.14)",
        },
        glow: {
          green: "#5a7c60",
          warm: "#9ca88a",
        },
      },
      backgroundImage: {
        "glow-radial":
          "radial-gradient(ellipse 80% 60% at 65% 20%, #5a7c6066 0%, transparent 70%)",
        "glow-left":
          "radial-gradient(ellipse 50% 40% at 10% 60%, #9ca88a33 0%, transparent 70%)",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease forwards",
        "pulse-slow": "pulse 4s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 3. Global CSS (`globals.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@layer base {
  :root {
    --background: 0 0% 3%;
    --foreground: 0 0% 100%;
    --card: 0 0% 4%;
    --card-foreground: 0 0% 100%;
    --border: 0 0% 100% / 0.08;
    --input: 0 0% 100% / 0.08;
    --ring: 0 0% 100% / 0.2;
    --radius: 1rem;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-white font-sans antialiased;
  }
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #080808; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 9999px; }
```

---

## 4. Component Recipes (shadcn/ui + Tailwind)

### 4.1 Glow Background Canvas

Place this as the **first child** of your hero section. The blobs create the
signature ambient glow of the reference design.

```tsx
// components/GlowCanvas.tsx
export function GlowCanvas() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Top-right sage green blob */}
      <div className="absolute -top-32 right-0 h-[600px] w-[800px] rounded-full bg-[radial-gradient(ellipse,#5a7c6055_0%,transparent_65%)] blur-3xl" />
      {/* Bottom-left warm blob */}
      <div className="absolute bottom-0 -left-20 h-[400px] w-[500px] rounded-full bg-[radial-gradient(ellipse,#9ca88a22_0%,transparent_70%)] blur-3xl" />
    </div>
  );
}
```

### 4.2 Navbar

```tsx
// components/Navbar.tsx
import { Button } from "@/components/ui/button";

const links = ["Home", "DeFi App", "Assets", "Features", "Pricing", "FAQ"];

export function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Logo */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10">
          <span className="text-sm font-bold">⊙</span>
        </div>

        {/* Nav links pill */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2 backdrop-blur-xl">
          {links.map((link) => (
            <a
              key={link}
              href="#"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {link}
            </a>
          ))}
          {/* Protection badge */}
          <div className="ml-2 flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/80">
            Protection <span className="text-white/40">↗</span>
          </div>
        </nav>

        {/* CTA */}
        <Button
          variant="ghost"
          className="gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] text-sm text-white/80 hover:bg-white/[0.08] hover:text-white"
        >
          <span className="h-3.5 w-3.5 rounded-full border border-white/40" />
          Create Account
        </Button>
      </div>
    </header>
  );
}
```

### 4.3 Hero Section

```tsx
// components/Hero.tsx
import { Button } from "@/components/ui/button";
import { GlowCanvas } from "./GlowCanvas";

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      <GlowCanvas />

      {/* Announcement badge */}
      <div className="animate-fade-up mb-8 flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-4 py-2 backdrop-blur-sm">
        <span className="h-2 w-2 rounded-full bg-glow-green" />
        <span className="text-sm font-medium text-white/80">
          Unlock Your Assets Spark!
        </span>
        <span className="text-white/40">→</span>
      </div>

      {/* Headline */}
      <h1 className="animate-fade-up max-w-3xl text-center text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl [animation-delay:100ms]">
        One-click for Asset{" "}
        <span className="bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">
          Defense
        </span>
      </h1>

      {/* Subtitle */}
      <p className="animate-fade-up mt-6 max-w-xl text-center text-base text-white/45 md:text-lg [animation-delay:200ms]">
        Dive into the art assets, where innovative blockchain technology meets
        financial expertise
      </p>

      {/* CTA buttons */}
      <div className="animate-fade-up mt-10 flex items-center gap-4 [animation-delay:300ms]">
        <Button className="rounded-full bg-white/[0.06] px-6 py-2.5 text-sm font-medium text-white hover:bg-white/[0.1] border border-white/[0.12]">
          Open App ↗
        </Button>
        <Button className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black hover:bg-white/90">
          Discover More
        </Button>
      </div>

      {/* Floating asset labels (left/right side) */}
      <AssetPin label="Cortex" value="20.945" className="absolute left-12 top-1/3" />
      <AssetPin label="Aelf" value="19.346" className="absolute left-12 bottom-1/3" />
      <AssetPin label="Quant" value="2.945" className="absolute right-12 top-1/3" />
      <AssetPin label="Meeton" value="440" className="absolute right-12 bottom-1/3" />

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-8 flex items-center gap-3 text-xs text-white/40">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06]">
          ↓
        </div>
        02/03 · Scroll down
      </div>

      {/* DeFi horizons label */}
      <div className="absolute bottom-8 right-8 text-right">
        <p className="text-xs font-medium text-white/60">DeFi horizons</p>
        <div className="mt-1 h-px w-8 bg-white/30" />
      </div>
    </section>
  );
}

function AssetPin({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-xs font-medium text-white/80">• {label}</span>
      <span className="pl-3 text-[10px] text-white/35">{value}</span>
    </div>
  );
}
```

### 4.4 Brand Logo Strip

```tsx
// components/BrandStrip.tsx
const brands = ["▲ Vercel", "✳ loom", "S Cash App", "⊙ Loops", "_zapier", "ramp ✈", "❄ Raycast"];

export function BrandStrip() {
  return (
    <div className="border-t border-white/[0.06] bg-black py-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 px-6">
        {brands.map((brand) => (
          <span
            key={brand}
            className="text-sm font-medium text-white/30 transition-colors hover:text-white/60"
          >
            {brand}
          </span>
        ))}
      </div>
    </div>
  );
}
```

### 4.5 Glass Card (generic reusable)

```tsx
// components/GlassCard.tsx
import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md",
        "transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.06]",
        className
      )}
    >
      {children}
    </div>
  );
}
```

---

## 5. shadcn/ui Setup Checklist

Run these once per project before using component recipes above:

```bash
# 1. Init shadcn in a Next.js / Vite project
npx shadcn@latest init

# When prompted:
#  Style     → Default
#  Base color → Neutral (we override all colours in globals.css)
#  CSS variables → Yes

# 2. Add needed primitives
npx shadcn@latest add button badge separator
```

Then override `components/ui/button.tsx` variants if needed to match pill style.

---

## 6. Page Assembly Pattern

```tsx
// app/page.tsx (Next.js App Router)
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { BrandStrip } from "@/components/BrandStrip";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <BrandStrip />
    </main>
  );
}
```

---

## 7. Rules & Anti-Patterns

> **Always follow these when using this vibe:**

1. **No saturated colours.** The palette is near-monochrome. Any accent must be
   desaturated (sage green, warm grey). Avoid red, bright blue, or orange.
2. **Glow blobs must be `blur-3xl` or higher** and kept at `opacity-30–45` to
   stay ambient, not garish.
3. **Glass surfaces use `bg-white/[0.04]` not `bg-white/10`** — too opaque
   breaks the depth illusion.
4. **All interactive elements need `transition-all duration-300`** for smooth
   hover state changes.
5. **Typography hierarchy is strictly two weights:** `font-bold` for display,
   `font-medium` for UI chrome, `font-normal` for body copy.
6. **Never use coloured borders.** Borders are always `border-white/[0.08]`
   (resting) and `border-white/[0.14]` (hover/focus).
7. **Use `rounded-full` for all buttons and badges.** Cards use `rounded-2xl`.
8. **Asset / data labels float absolutely** — they are decorative, not in flow.
9. **Brand strip opacity is < 35%** so brands read as trust signals, not
   distractions.
10. **Keep the background pure `#080808`**, not `#000`. Pure black looks flat;
    `#080808` pairs better with the glow blobs.
```
