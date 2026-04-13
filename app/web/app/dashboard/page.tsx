import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Decorative document card data
const recentDocs = [
  { name: "Q4 Financial Report.pdf", pages: 42, status: "Ready", date: "Today" },
  { name: "Product Roadmap 2025.pdf", pages: 18, status: "Ready", date: "Yesterday" },
  { name: "Research Paper — RAG.pdf", pages: 31, status: "Processing…", date: "2 days ago" },
];

export default async function DashboardPage() {
  const { userId } = await auth();

  // Middleware already handles this, but double-check server-side
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const firstName = user?.firstName ?? "there";

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

        {/* Stats row */}
        <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Documents", value: "3" },
            { label: "Chats", value: "12" },
            { label: "Pages Indexed", value: "91" },
            { label: "Queries", value: "48" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.05]"
            >
              <p className="text-xs font-medium uppercase tracking-widest text-white/40">
                {stat.label}
              </p>
              <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Upload CTA card */}
        <div className="mb-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-8 py-14 text-center transition-all duration-300 hover:border-white/[0.2] hover:bg-white/[0.04]">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06]">
            <span className="text-2xl">📄</span>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-white">
            Upload your first PDF
          </h2>
          <p className="mb-6 max-w-xs text-sm text-white/40">
            Drop a document and start chatting with it in seconds using AI-powered RAG.
          </p>
          <button className="rounded-full bg-white px-7 py-2.5 text-sm font-semibold text-black transition-all duration-300 hover:bg-white/90 hover:shadow-[0_0_24px_rgba(255,255,255,0.12)]">
            Choose PDF ↗
          </button>
        </div>

        {/* Recent documents */}
        <div>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
            Recent Documents
          </h2>
          <div className="space-y-3">
            {recentDocs.map((doc) => (
              <div
                key={doc.name}
                className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                    <span className="text-sm">📄</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/85">{doc.name}</p>
                    <p className="text-xs text-white/35">{doc.pages} pages · {doc.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      doc.status === "Ready"
                        ? "border border-[#5a7c60]/40 bg-[#5a7c60]/10 text-[#9ca88a]"
                        : "border border-white/[0.08] bg-white/[0.04] text-white/40"
                    }`}
                  >
                    {doc.status}
                  </span>
                  {doc.status === "Ready" && (
                    <button className="rounded-full border border-white/[0.12] bg-white/[0.05] px-4 py-1.5 text-xs font-medium text-white/70 transition-all duration-300 hover:bg-white/[0.1] hover:text-white">
                      Chat →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
