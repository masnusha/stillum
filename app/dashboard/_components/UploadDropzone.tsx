"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CloudUpload,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { getPresignedUrl, getImagePresignedUrl, createTrackRecord, type TrackMetadata } from "@/app/actions/track";
import { addTrackToPlaylist } from "@/app/actions/playlist";
import TrackMetadataModal from "./TrackMetadataModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadState = "idle" | "pending-modal" | "uploading" | "success" | "error";

interface Props {
  /** "button" → compact header CTA  |  "zone" → centered empty-state zone */
  variant: "button" | "zone";
  /** If provided, the uploaded track is automatically linked to this playlist */
  playlistId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Reads duration (in seconds) from an audio File using an HTMLAudioElement. */
function getAudioDuration(file: File): Promise<number> {
  return new Promise(resolve => {
    const url   = URL.createObjectURL(file);
    const audio = new Audio();
    audio.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(audio.duration) ? audio.duration : 0);
    });
    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });
    audio.src = url;
  });
}

// ─── Core upload logic ────────────────────────────────────────────────────────

function useUploader(playlistId?: string) {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const router = useRouter();

  /** Step 1: file selected/dropped — open metadata modal */
  const selectFile = (file: File) => {
    setPendingFile(file);
    setState("pending-modal");
    setError("");
  };

  /** Step 2: modal submitted — upload cover (optional) + audio, then save to DB */
  const upload = async (metadata: TrackMetadata, coverFile?: File) => {
    if (!pendingFile) return;
    setState("uploading");
    setProgress(5);

    // ── Extract duration before upload (non-blocking, best-effort) ────────────
    const duration = await getAudioDuration(pendingFile);

    // ── Get audio presigned URL ───────────────────────────────────────────────
    const audioPresign = await getPresignedUrl(
      pendingFile.name,
      pendingFile.type,
      pendingFile.size
    );
    if ("error" in audioPresign) {
      setState("error");
      setError(audioPresign.error);
      return;
    }
    setProgress(15);

    // ── Upload cover to S3 if provided ────────────────────────────────────────
    let coverKey: string | undefined;
    if (coverFile) {
      const coverPresign = await getImagePresignedUrl(coverFile.type, coverFile.size);
      if ("error" in coverPresign) {
        setState("error");
        setError(coverPresign.error);
        return;
      }
      setProgress(25);

      try {
        const res = await fetch(coverPresign.presignedUrl, {
          method: "PUT",
          body: coverFile,
          headers: { "Content-Type": coverFile.type },
        });
        if (!res.ok) throw new Error(`Cover upload failed: ${res.status}`);
      } catch (err) {
        setState("error");
        setError("Cover upload failed. Please try again.");
        console.error(err);
        return;
      }
      coverKey = coverPresign.fileKey;
      setProgress(55);
    } else {
      setProgress(35);
    }

    // ── Upload audio to S3 ────────────────────────────────────────────────────
    try {
      const res = await fetch(audioPresign.presignedUrl, {
        method: "PUT",
        body: pendingFile,
        headers: { "Content-Type": pendingFile.type },
      });
      if (!res.ok) throw new Error(`Audio upload failed: ${res.status}`);
    } catch (err) {
      setState("error");
      setError("Upload to storage failed. Please try again.");
      console.error(err);
      return;
    }
    setProgress(85);

    // ── Save to DB ────────────────────────────────────────────────────────────
    const dbResult = await createTrackRecord(audioPresign.fileKey, metadata, coverKey, duration);
    if ("error" in dbResult) {
      setState("error");
      setError(dbResult.error);
      return;
    }

    // ── Link to playlist if provided ──────────────────────────────────────
    if (playlistId) {
      await addTrackToPlaylist(playlistId, dbResult.trackId);
    }

    setProgress(100);
    setState("success");
    setPendingFile(null);
    router.refresh();

    setTimeout(() => {
      setState("idle");
      setProgress(0);
    }, 2500);
  };

  const cancelModal = () => {
    setPendingFile(null);
    setState("idle");
    setError("");
  };

  const reset = () => {
    setState("idle");
    setError("");
    setProgress(0);
    setPendingFile(null);
  };

  return { state, progress, error, pendingFile, selectFile, upload, cancelModal, reset };
}

// ─── UploadDropzone ───────────────────────────────────────────────────────────

export default function UploadDropzone({ variant, playlistId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, progress, error, pendingFile, selectFile, upload, cancelModal, reset } =
    useUploader(playlistId);
  const [dragging, setDragging] = useState(false);

  const openPicker = () => {
    if (state === "uploading") return;
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (state === "uploading") return;
    const file = e.dataTransfer.files[0];
    if (file) selectFile(file);
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="audio/mpeg,audio/wav,.mp3,.wav"
      className="sr-only"
      onChange={handleChange}
      aria-hidden
    />
  );

  const modal = pendingFile && state === "pending-modal" && (
    <TrackMetadataModal
      file={pendingFile}
      onSubmit={(metadata, coverFile) => upload(metadata, coverFile)}
      onClose={cancelModal}
    />
  );

  // ── Button variant ──────────────────────────────────────────────────────────
  if (variant === "button") {
    return (
      <>
        {fileInput}
        {modal}
        <button
          onClick={openPicker}
          disabled={state === "uploading"}
          className="flex items-center gap-2 bg-white text-[#030712] text-[13px] font-semibold px-5 py-2 rounded-full hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-150"
        >
          {state === "uploading" ? (
            <Loader2 size={13} className="animate-spin shrink-0" />
          ) : (
            <span className="text-base leading-none" aria-hidden>+</span>
          )}
          {state === "uploading" ? "Uploading…" : "Upload Track"}
        </button>
      </>
    );
  }

  // ── Zone variant ────────────────────────────────────────────────────────────
  return (
    <>
      {modal}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload audio file"
        onClick={openPicker}
        onKeyDown={(e) => e.key === "Enter" && openPicker()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center gap-5 text-center outline-none cursor-pointer group ${
          state === "uploading" ? "pointer-events-none" : ""
        }`}
      >
        {fileInput}

        {/* Icon tile */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 -m-10 rounded-full pointer-events-none"
            style={{
              background: dragging
                ? "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 70%)",
              transition: "background 0.3s",
            }}
          />
          <div
            className={`relative w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-300 ${
              dragging
                ? "bg-white/[0.07] border-white/[0.2] scale-105"
                : state === "uploading"
                ? "bg-white/[0.04] border-white/[0.1]"
                : state === "success"
                ? "bg-white/[0.05] border-white/[0.14]"
                : state === "error"
                ? "bg-red-500/[0.06] border-red-400/[0.2]"
                : "bg-white/[0.03] border-white/[0.05] group-hover:border-white/[0.12] group-hover:bg-white/[0.05]"
            }`}
          >
            {state === "idle" && (
              <CloudUpload size={24} strokeWidth={1.25} className="text-white/25 group-hover:text-white/40 transition-colors" />
            )}
            {state === "uploading" && (
              <Loader2 size={22} strokeWidth={1.25} className="text-white/35 animate-spin" />
            )}
            {state === "success" && (
              <CheckCircle size={22} strokeWidth={1.25} className="text-white/50" />
            )}
            {state === "error" && (
              <AlertCircle size={22} strokeWidth={1.25} className="text-red-400/60" />
            )}
          </div>
        </div>

        {/* Copy & progress */}
        <div className="space-y-2">
          {state === "idle" && (
            <>
              <p className="text-xl font-medium text-white tracking-tight">
                Your cloud is empty
              </p>
              <p className="text-[13px] text-white/30 leading-relaxed max-w-[220px]">
                {dragging
                  ? "Drop to upload"
                  : "Drag and drop your high-fidelity audio files here"}
              </p>
            </>
          )}

          {state === "uploading" && (
            <>
              <p className="text-xl font-medium text-white tracking-tight">
                Uploading…
              </p>
              <div className="w-44 h-[2px] bg-white/[0.06] rounded-full overflow-hidden mx-auto">
                <div
                  className="h-full bg-white/35 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}

          {state === "success" && (
            <p className="text-xl font-medium text-white tracking-tight">
              Track added
            </p>
          )}

          {state === "error" && (
            <>
              <p className="text-xl font-medium text-white tracking-tight">
                Upload failed
              </p>
              <p className="text-[13px] text-red-400/50 leading-relaxed max-w-[240px]">
                {error}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="text-[12px] text-white/25 hover:text-white/55 transition-colors mt-1"
              >
                Try again
              </button>
            </>
          )}
        </div>

        {state === "idle" && (
          <p className="text-[11px] text-white/15 tracking-wide uppercase">
            .mp3 &nbsp;·&nbsp; .wav &nbsp;·&nbsp; up to 15 MB
          </p>
        )}
      </div>
    </>
  );
}
