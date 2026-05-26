"use client";

import { useEffect, useState, useCallback } from "react";

interface Document {
  id: string;
  fileName: string;
  fileSize: number | null;
  fileType: string | null;
  pageCount: number | null;
  status: "pending" | "uploaded" | "queued" | "processing" | "completed" | "failed";
  createdAt: string;
  errorMessage: string | null;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

const statusConfig: Record<
  Document["status"],
  { label: string; classes: string; dot?: boolean }
> = {
  pending: {
    label: "Pending",
    classes: "border border-white/[0.08] bg-white/[0.04] text-white/40",
  },
  uploaded: {
    label: "Uploaded",
    classes: "border border-white/[0.08] bg-white/[0.04] text-white/50",
  },
  queued: {
    label: "Queued",
    classes: "border border-amber-500/30 bg-amber-500/10 text-amber-400/80",
    dot: true,
  },
  processing: {
    label: "Processing…",
    classes: "border border-blue-500/30 bg-blue-500/10 text-blue-400/80",
    dot: true,
  },
  completed: {
    label: "Ready",
    classes: "border border-[#5a7c60]/40 bg-[#5a7c60]/10 text-[#9ca88a]",
  },
  failed: {
    label: "Failed",
    classes: "border border-red-500/30 bg-red-500/10 text-red-400/80",
  },
};

export function DocumentList({ refreshKey }: { refreshKey: number }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[72px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]"
          />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center">
        <p className="text-sm text-white/30">
          No documents yet. Upload a PDF to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {docs.map((doc) => {
        const status = statusConfig[doc.status];
        return (
          <div
            key={doc.id}
            className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.05]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                <span className="text-sm">📄</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white/85">{doc.fileName}</p>
                <p className="text-xs text-white/35">
                  {formatFileSize(doc.fileSize)}
                  {doc.pageCount ? ` · ${doc.pageCount} pages` : ""}
                  {" · "}
                  {formatRelativeTime(doc.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.classes}`}>
                {status.dot && (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                )}
                {status.label}
              </span>
              {doc.status === "completed" && (
                <button className="rounded-full border border-white/[0.12] bg-white/[0.05] px-4 py-1.5 text-xs font-medium text-white/70 transition-all duration-300 hover:bg-white/[0.1] hover:text-white">
                  Chat →
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
