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

