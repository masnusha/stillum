"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, ImagePlus, Globe, Lock, Check } from "lucide-react";
import CoverCropModal from "@/app/dashboard/_components/CoverCropModal";
import { updatePlaylist, getPlaylistCoverPresignedUrl } from "@/app/actions/playlist";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaylistSnapshot {
  id:          string;
  name:        string;
  description: string | null;
  coverUrl:    string | null;
  isPublic:    boolean;
}

interface Props {
  playlist: PlaylistSnapshot;
  onClose:  () => void;
  onSaved:  (updated: Partial<PlaylistSnapshot>) => void;
}

// ─── PrivacyToggle ────────────────────────────────────────────────────────────

function PrivacyToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-colors group"
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
      <div className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0 ${checked ? "bg-white/30" : "bg-white/[0.08]"}`}>
        <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-200 ${checked ? "left-[22px]" : "left-[3px]"}`} />
      </div>
    </button>
  );
}

// ─── EditPlaylistModal ────────────────────────────────────────────────────────

export default function EditPlaylistModal({ playlist, onClose, onSaved }: Props) {
  const router = useRouter();

  const [name,        setName]        = useState(playlist.name);
  const [desc,        setDesc]        = useState(playlist.description ?? "");
  const [isPublic,    setIsPublic]    = useState(playlist.isPublic);

  // Cover
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  const [cropSrc,     setCropSrc]         = useState<string | null>(null);
  const [coverBlob,   setCoverBlob]       = useState<Blob | null>(null);
  const [coverPreview, setCoverPreview]   = useState<string | null>(null);

  // Submit state
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const displayedCover = coverPreview ?? playlist.coverUrl;

  // ── Cover crop ──────────────────────────────────────────────────────────

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

  // ── Save ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim()) { setError("Введите название"); return; }
    setSaving(true);
    setError(null);

    let coverKey: string | null = null;

    if (coverBlob) {
      const res = await getPlaylistCoverPresignedUrl(
        coverBlob.type || "image/jpeg",
        coverBlob.size,
      );
      if ("error" in res) { setError(res.error); setSaving(false); return; }

      const up = await fetch(res.presignedUrl, {
        method:  "PUT",
        body:    coverBlob,
        headers: { "Content-Type": coverBlob.type || "image/jpeg" },
      });
      if (!up.ok) { setError("Ошибка загрузки обложки."); setSaving(false); return; }
      coverKey = res.fileKey;
    }

    const result = await updatePlaylist(playlist.id, {
      name: name.trim(),
      description: desc,
      isPublic,
      coverKey,
    });

    setSaving(false);
    if (result.error) { setError(result.error); return; }

    setSuccess(true);
    onSaved({
      name:        name.trim(),
      description: desc.trim() || null,
      isPublic,
      ...(coverPreview ? { coverUrl: coverPreview } : {}),
    });
    router.refresh();
    setTimeout(onClose, 500);
  };

  // ── Render ──────────────────────────────────────────────────────────────

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

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{    opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
        onMouseDown={onClose}
      >
        {/* Sheet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{    opacity: 0, scale: 0.97, y: 12  }}
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-[#0a0a0c] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Scrollable body */}
          <div className="overflow-y-auto max-h-[90vh] scrollbar-hide p-6 md:p-8">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[15px] font-semibold text-white">Редактировать плейлист</h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Cover */}
            <div className="flex justify-center mb-6">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-40 h-40 rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.07] flex flex-col items-center justify-center gap-2 group hover:border-white/20 transition-colors focus:outline-none"
              >
                {displayedCover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayedCover} alt="cover" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImagePlus size={22} strokeWidth={1.5} className="text-white/20 group-hover:text-white/40 transition-colors" />
                    <span className="text-[11px] text-white/25 group-hover:text-white/45 transition-colors">Добавить обложку</span>
                  </>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImagePlus size={18} strokeWidth={1.5} className="text-white/70" />
                </div>
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
            <div className="space-y-4">

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-widest text-white/30 font-bold px-1">
                  Название <span className="text-red-400/60">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  placeholder="Название плейлиста"
                  className="w-full bg-transparent border-b border-white/10 focus:border-white/40 outline-none text-sm text-white/80 placeholder:text-white/20 py-2 transition-colors"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-widest text-white/30 font-bold px-1">
                  Описание
                </label>
                <div className="relative bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 focus-within:border-white/20 transition-colors">
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Коротко о плейлисте..."
                    className="w-full bg-transparent resize-none outline-none text-sm text-white/70 placeholder:text-white/20 leading-relaxed pb-4"
                  />
                  <span className={`absolute bottom-3 right-4 text-[10px] font-medium tracking-widest transition-colors ${
                    desc.length >= 270 ? "text-amber-400/60" : "text-white/20"
                  }`}>
                    {desc.length}/300
                  </span>
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div className="mt-4">
              <PrivacyToggle checked={isPublic} onChange={setIsPublic} />
            </div>

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || success}
              className="mt-6 w-full bg-white text-black font-bold py-3.5 rounded-xl hover:scale-[1.02] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {success ? (
                <>
                  <Check size={15} strokeWidth={2.5} />
                  Сохранено
                </>
              ) : saving ? (
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                "Сохранить изменения"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
