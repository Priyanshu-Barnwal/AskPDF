// components/GlowCanvas.tsx
// Ambient glow background — custom-vibe skill §4.1
export function GlowCanvas() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Top-right sage green blob */}
      <div className="absolute -top-32 right-0 h-[600px] w-[800px] rounded-full bg-[radial-gradient(ellipse,#5a7c6055_0%,transparent_65%)] blur-3xl" />
      {/* Bottom-left warm blob */}
      <div className="absolute bottom-0 -left-20 h-[400px] w-[500px] rounded-full bg-[radial-gradient(ellipse,#9ca88a22_0%,transparent_70%)] blur-3xl" />
      {/* Centre subtle glow for depth */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[600px] rounded-full bg-[radial-gradient(ellipse,#5a7c6015_0%,transparent_70%)] blur-3xl" />
    </div>
  );
}
