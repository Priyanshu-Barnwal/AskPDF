"use client";

import { useState, useCallback, useRef } from "react";

type UploadState = "idle" | "uploading" | "processing" | "success" | "error";

interface UploadProgress {
  state: UploadState;
  percent: number;
  fileName: string | null;
  error: string | null;
}

export function UploadZone({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [upload, setUpload] = useState<UploadProgress>({
    state: "idle",
    percent: 0,
    fileName: null,
    error: null,
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    if (file.type !== "application/pdf") {
      setUpload({
        state: "error",
        percent: 0,
        fileName: file.name,
        error: "Only PDF files are supported.",
      });
      return;
    }

    // Validate file size (50MB max)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUpload({
        state: "error",
        percent: 0,
        fileName: file.name,
        error: "File size exceeds 50MB limit.",
      });
      return;
    }

    setUpload({ state: "uploading", percent: 0, fileName: file.name, error: null });

    try {
      // Step 1: Get presigned URL
      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!presignedRes.ok) {
        const err = await presignedRes.json();
        throw new Error(err.error || "Failed to get upload URL");
      }

      const { presignedUrl, s3Key } = await presignedRes.json();

      // Step 2: Upload directly to S3
      setUpload((prev) => ({ ...prev, percent: 10 }));

      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 80) + 10; // 10–90%
            setUpload((prev) => ({ ...prev, percent: pct }));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`S3 upload failed with status ${xhr.status}`));
        });
        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      // Step 3: Notify backend → DB insert + RabbitMQ
      setUpload((prev) => ({ ...prev, state: "processing", percent: 92 }));

      const docRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          s3Key,
        }),
      });

      if (!docRes.ok) {
        const err = await docRes.json();
        throw new Error(err.error || "Failed to register document");
      }

      setUpload({ state: "success", percent: 100, fileName: file.name, error: null });
      onUploadComplete?.();

      // Reset after a brief success state
      setTimeout(() => {
        setUpload({ state: "idle", percent: 0, fileName: null, error: null });
      }, 3000);
    } catch (err) {
      setUpload({
        state: "error",
        percent: 0,
        fileName: file.name,
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }, [onUploadComplete]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile]
  );

  const isActive = upload.state === "uploading" || upload.state === "processing";

  return (
    <div
      id="upload-zone"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isActive && fileInputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center
        rounded-2xl border border-dashed px-8 py-14
        text-center transition-all duration-300 cursor-pointer
        ${isDragOver
          ? "border-[#5a7c60] bg-[#5a7c60]/[0.06] shadow-[0_0_40px_rgba(90,124,96,0.12)]"
          : upload.state === "error"
            ? "border-red-500/30 bg-red-500/[0.03]"
            : upload.state === "success"
              ? "border-[#5a7c60]/40 bg-[#5a7c60]/[0.06]"
              : "border-white/[0.12] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04]"
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Icon */}
      <div
        className={`
          mb-4 flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300
          ${upload.state === "success"
            ? "border-[#5a7c60]/40 bg-[#5a7c60]/10"
            : upload.state === "error"
              ? "border-red-500/30 bg-red-500/10"
              : "border-white/[0.12] bg-white/[0.06]"
          }
        `}
      >
        {upload.state === "success" ? (
          <svg className="h-6 w-6 text-[#5a7c60]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : upload.state === "error" ? (
          <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : isActive ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        ) : (
          <span className="text-2xl">📄</span>
        )}
      </div>

      {/* Text */}
      <h2 className="mb-2 text-lg font-semibold text-white">
        {upload.state === "success"
          ? "Upload complete!"
          : upload.state === "error"
            ? "Upload failed"
            : isActive
              ? upload.state === "processing"
                ? "Registering document…"
                : "Uploading to S3…"
              : "Upload your PDF"
        }
      </h2>

      {upload.state === "idle" && (
        <p className="mb-6 max-w-xs text-sm text-white/40">
          Drag &amp; drop a PDF here, or click to browse. Max 50MB.
        </p>
      )}

      {upload.fileName && upload.state !== "idle" && (
        <p className="mb-3 max-w-xs truncate text-sm text-white/50">
          {upload.fileName}
        </p>
      )}

      {upload.error && (
        <p className="mb-4 max-w-xs text-sm text-red-400/80">{upload.error}</p>
      )}

      {/* Progress bar */}
      {isActive && (
        <div className="mt-2 w-full max-w-xs">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#5a7c60] to-[#9ca88a] transition-all duration-300"
              style={{ width: `${upload.percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-white/35">{upload.percent}%</p>
        </div>
      )}

      {/* CTA button (idle state) */}
      {upload.state === "idle" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="rounded-full bg-white px-7 py-2.5 text-sm font-semibold text-black transition-all duration-300 hover:bg-white/90 hover:shadow-[0_0_24px_rgba(255,255,255,0.12)]"
        >
          Choose PDF ↗
        </button>
      )}

      {/* Retry button (error state) */}
      {upload.state === "error" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setUpload({ state: "idle", percent: 0, fileName: null, error: null });
          }}
          className="rounded-full border border-white/[0.12] bg-white/[0.05] px-6 py-2 text-sm font-medium text-white/70 transition-all duration-300 hover:bg-white/[0.1] hover:text-white"
        >
          Try again
        </button>
      )}
    </div>
  );
}
