"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { DocumentList } from "@/components/DocumentList";

export function DashboardContent({ firstName }: { firstName: string }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="relative min-h-[calc(100vh-57px)] overflow-hidden px-6 py-12 md:px-12 lg:px-24">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-[500px] w-[700px] rounded-full bg-[radial-gradient(ellipse,#5a7c6044_0%,transparent_65%)] blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-[350px] w-[450px] rounded-full bg-[radial-gradient(ellipse,#9ca88a1a_0%,transparent_70%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Header greeting */}
        <div className="mb-10 animate-[fadeUp_0.5s_ease_forwards]">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-4 py-1.5 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#5a7c60]" />
            <span className="text-xs font-medium text-white/70">Dashboard</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            Welcome back, {firstName} 👋
          </h1>
          <p className="mt-3 text-base text-white/45">
            Upload a PDF and start asking questions instantly.
          </p>
        </div>

        {/* Upload zone */}
        <div className="mb-10">
          <UploadZone onUploadComplete={() => setRefreshKey((k) => k + 1)} />
        </div>

        {/* Documents list */}
        <div>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
            Your Documents
          </h2>
          <DocumentList refreshKey={refreshKey} />
        </div>
      </div>
    </main>
  );
}
