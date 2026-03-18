"use client";

// Reusable form body for playlist creation.
// Used by CreatePlaylistModal (standalone page) AND AddToPlaylistModal (inline create view).
// Has no backdrop or modal wrapper — caller owns the shell.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Globe, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import { createPlaylist, getPlaylistCoverPresignedUrl, addTrackToPlaylist } from "@/app/actions/playlist";
import CoverCropModal from "@/app/dashboard/_components/CoverCropModal";

// ─── PrivacyToggle ────────────────────────────────────────────────────────────

function PrivacyToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full p-4 rounded-xl
                 bg-white/[0.02] border border-white/[0.05]
                 hover:border-white/[0.1] transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
          {checked
            ? <Globe size={13} strokeWidth={1.5} className="text-white/50" />
            : <Lock  size={13} strokeWidth={1.5} className="text-white/30" />
          }
        </div>
        <div className="text-left">
          <p className="text-[13px] text-white/60 group-hover:text-white/80 transition-colors leading-tight">
            {checked ? "Публичный доступ" : "Только для вас"}
          </p>
          <p className="text-[11px] text-white/30 leading-relaxed mt-0.5 pr-4">
            {checked
              ? "Плейлист виден всем по прямой ссылке."
              : "Плейлист доступен только вам."
            }
          </p>
        </div>
      </div>
      <div className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0
                       ${checked ? "bg-white/30" : "bg-white/[0.08]"}`}>
        <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-200
                         ${checked ? "left-[22px]" : "left-[3px]"}`} />
      </div>
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** Called after successful creation (or on cancel) — closes the parent wrapper. */
  onClose: () => void;
  /**
   * If provided, the track is added to the newly created playlist automatically.
   * The submit button label also changes to "Создать и добавить".
   */
  trackId?: string;
  /** Extra callback fired after success — e.g. close a parent modal. */
  onSuccess?: () => void;
}

// ─── CreatePlaylistForm ───────────────────────────────────────────────────────

export default function CreatePlaylistForm({ onClose, trackId, onSuccess }: Props) {
  const router = useRouter();

  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [isPublic,    setIsPublic]    = useState(false);

  const fileInputRef                        = useRef<HTMLInputElement>(null);
  const [cropSrc,     setCropSrc]     = useState<string | null>(null);
  const [coverBlob,   setCoverBlob]   = useState<Blob | null>(null);
  const [coverPreview,setCoverPreview]= useState<string | null>(null);
  const [uploading,   setUploading]   = useState(false);

  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Cover ────────────────────────────────────────────────────────────────────

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setCropSrc(URL.createObjectURL(f)); e.target.value = ""; }
  };

  const handleCropConfirm = (blob: Blob) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCoverBlob(blob);
    setCoverPreview(URL.createObjectURL(blob));
  };

  const handleCropClose = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Введите название плейлиста"); return; }
    setSaving(true);
    setError(null);

    // Upload cover if chosen
    let coverKey: string | null = null;
    if (coverBlob) {
      setUploading(true);
      const res = await getPlaylistCoverPresignedUrl(
        coverBlob.type || "image/jpeg",
        coverBlob.size,
      );
      if ("error" in res) {
        setError(res.error);
        setSaving(false);
        setUploading(false);
        return;
      }
      const up = await fetch(res.presignedUrl, {
        method:  "PUT",
        body:    coverBlob,
        headers: { "Content-Type": coverBlob.type || "image/jpeg" },
      });
      setUploading(false);
      if (!up.ok) {
        setError("Ошибка загрузки обложки. Попробуйте снова.");
        setSaving(false);
        return;
      }
      coverKey = res.fileKey;
    }

    // Create playlist
    const result = await createPlaylist({ name: name.trim(), description, isPublic, coverKey });
    if ("error" in result) { setError(result.error); setSaving(false); return; }

    // Add track if requested
    if (trackId) {
      const addRes = await addTrackToPlaylist(result.playlistId, trackId);
      if (addRes.error) { setError(addRes.error); setSaving(false); return; }
      toast.success(`Плейлист «${name.trim()}» создан, трек добавлен`);
    } else {
      toast.success("Плейлист успешно создан");
    }

    setSuccess(true);
    onSuccess?.();

    setTimeout(() => {
      onClose();
      if (trackId) {
        router.refresh();
      } else {
        router.push(`/dashboard/playlists/${result.playlistId}`);
      }
    }, 350);

    setSaving(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <AnimatePresence>
        {cropSrc && (
          <CoverCropModal
            imageUrl={cropSrc}
            onConfirm={handleCropConfirm}
            onClose={handleCropClose}
          />
        )}
      </AnimatePresence>

      {/* Cover pick */}
      <div className="flex justify-center mb-6">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-40 h-40 rounded-2xl overflow-hidden
                     bg-white/[0.03] border border-white/[0.07]
                     flex flex-col items-center justify-center gap-2 group
                     hover:border-white/20 transition-colors"
        >
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
          ) : (
            <>
              <ImagePlus size={22} strokeWidth={1.5} className="text-white/20 group-hover:text-white/40 transition-colors" />
              <span className="text-[11px] text-white/25 group-hover:text-white/45 transition-colors">
                Добавить обложку
              </span>
            </>
          )}
          {coverPreview && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ImagePlus size={18} strokeWidth={1.5} className="text-white/70" />
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChosen}
        />
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1,  y:  0 }}
            exit={{    opacity: 0,  y: -4 }}
            className="mb-4 text-[13px] text-red-400/80 text-center"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Fields */}
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-widest text-white/30 font-bold px-1">
            Название <span className="text-red-400/60">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="Мой плейлист"
            className="w-full bg-transparent border-b border-white/10 focus:border-white/40
                       outline-none text-sm text-white/80 placeholder:text-white/20
                       py-2 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5 pt-2">
          <label className="text-[11px] uppercase tracking-widest text-white/30 font-bold px-1">
            Описание
          </label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Коротко о плейлисте..."
              className="w-full bg-transparent border-b border-white/10 focus:border-white/40
                         outline-none text-sm text-white/70 placeholder:text-white/20
                         py-2 resize-none transition-colors"
            />
            <span className="absolute right-0 bottom-2 text-[10px] text-white/20">
              {description.length}/300
            </span>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="mt-5">
        <PrivacyToggle checked={isPublic} onChange={setIsPublic} />
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || success}
        className="mt-6 w-full bg-white text-black font-bold py-3.5 rounded-xl
                   hover:scale-[1.02] active:scale-[0.99] transition-transform
                   disabled:opacity-60 disabled:scale-100
                   flex items-center justify-center gap-2"
      >
        {success ? (
          <>
            <Check size={15} strokeWidth={2.5} />
            {trackId ? "Добавлено" : "Создано"}
          </>
        ) : saving ? (
          <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
        ) : (
          trackId ? "Создать и добавить" : "Создать плейлист"
        )}
      </button>

      {uploading && (
        <p className="mt-2 text-center text-[11px] text-white/30">Загрузка обложки…</p>
      )}
    </>
  );
}
