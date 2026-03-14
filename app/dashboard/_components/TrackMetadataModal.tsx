"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ImagePlus, ChevronDown, Lock, Globe } from "lucide-react";
import type { TrackMetadata } from "@/app/actions/track";
import { updateTrackMetadata } from "@/app/actions/track";
import { usePlayerStore } from "@/store/usePlayerStore";
import CoverCropModal from "./CoverCropModal";

// ─── Genre list ───────────────────────────────────────────────────────────────

const GENRES = [
  "Ambient", "Blues", "Classical", "Country", "Dance", "Disco",
  "Drum & Bass", "Dubstep", "Electronic", "Experimental", "Folk",
  "Funk", "Hard Rock", "Hip-Hop", "House", "Indie", "Jazz", "Latin",
  "Lo-Fi", "Metal", "Minimal", "Neo Soul", "Noise", "Pop", "Post-Rock",
  "Punk", "R&B", "Reggae", "Rock", "Soul", "Synth-Pop", "Techno",
  "Trance", "Trap", "World",
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrackEditData {
  id:          string;
  title:       string;
  artist:      string;
  genre?:       string | null;
  releaseDate?: string | null;
  recordLabel?: string | null;
  buyLink?:     string | null;
  isExplicit:  boolean;
  isPublic:    boolean;
}

type Props =
  | {
      mode?: "create";
      file: File;
      onSubmit: (metadata: TrackMetadata, coverFile?: File) => void;
      onClose: () => void;
      onSaved?: never;
      initialData?: never;
    }
  | {
      mode: "edit";
      initialData: TrackEditData;
      onClose: () => void;
      onSaved?: () => void;
      file?: never;
      onSubmit?: never;
    };

function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/_/g, " ").trim();
}

/** YYYY-MM-DD → DD.MM.YYYY (для отображения). Пропускает уже отформатированные строки. */
function toDisplayDate(v: string | null | undefined): string {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-");
    return `${d}.${m}.${y}`;
  }
  return v; // уже DD.MM.YYYY или произвольная строка
}

/** DD.MM.YYYY → YYYY-MM-DD (для сохранения в БД). */
function toIsoDate(v: string): string {
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(v)) {
    const [d, m, y] = v.split(".");
    return `${y}-${m}-${d}`;
  }
  return v;
}

// ─── Field ────────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  maxLength?: number;
  type?: string;
}

function Field({ label, value, onChange, placeholder, required, maxLength = 200, type = "text" }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-medium tracking-widest uppercase text-white/25">
        {label}
        {required && <span className="text-white/35 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        autoComplete="off"
        className="w-full bg-white/[0.02] border border-white/[0.05] focus:border-white/[0.2] focus:bg-white/[0.05] transition-all duration-200 rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 outline-none"
      />
    </div>
  );
}

// ─── DateField ────────────────────────────────────────────────────────────────

function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 8);
    if (v.length >= 5) v = v.slice(0, 2) + "." + v.slice(2, 4) + "." + v.slice(4);
    else if (v.length >= 3) v = v.slice(0, 2) + "." + v.slice(2);
    onChange(v);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-medium tracking-widest uppercase text-white/25">
        Release Date
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder="ДД.ММ.ГГГГ"
        maxLength={10}
        autoComplete="off"
        className="w-full bg-white/[0.02] border border-white/[0.05] focus:border-white/[0.2] focus:bg-white/[0.05] transition-all duration-200 rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 outline-none"
      />
    </div>
  );
}

// ─── GenreSelect ──────────────────────────────────────────────────────────────

function GenreSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const containerRef        = useRef<HTMLDivElement>(null);

  const filtered = GENRES.filter(g => g.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch("");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setSearch(""); }
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onMouse); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <label className="block text-[10px] font-medium tracking-widest uppercase text-white/25">
        Genre
      </label>

      <button
        type="button"
        onClick={() => { setOpen(v => !v); setSearch(""); }}
        className={`w-full text-left rounded-xl px-3.5 py-2.5 text-[13px] bg-white/[0.02] border transition-all duration-200 flex items-center justify-between gap-2
          ${open ? "border-white/[0.2] bg-white/[0.05]" : "border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.03]"}`}
      >
        <span className={value ? "text-white" : "text-white/20"}>{value || "Select genre"}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {value && (
            <span role="button" aria-label="Clear" onClick={e => { e.stopPropagation(); onChange(""); }}
              className="text-white/20 hover:text-white/60 transition-colors">
              <X size={11} strokeWidth={2} />
            </span>
          )}
          <ChevronDown size={13} strokeWidth={1.5}
            className={`text-white/25 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            style={{ transformOrigin: "bottom center" }}
            className="absolute bottom-[calc(100%+6px)] left-0 right-0 z-20 bg-[#070E1F] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="px-2 pt-2 pb-1">
              <input type="text" placeholder="Search genres…" value={search}
                onChange={e => setSearch(e.target.value)} autoFocus
                className="w-full bg-white/[0.04] border border-white/[0.06] focus:border-white/[0.16] rounded-lg px-3 py-1.5 text-[12px] text-white placeholder-white/20 outline-none transition-colors" />
            </div>
            <ul className="max-h-[184px] overflow-y-auto pb-1.5"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
              {filtered.map(genre => (
                <li key={genre}>
                  <button type="button" onClick={() => { onChange(genre); setOpen(false); setSearch(""); }}
                    className={`w-full text-left px-4 py-[7px] text-[13px] transition-colors duration-100
                      ${value === genre ? "text-white bg-white/[0.07]" : "text-white/40 hover:text-white/85 hover:bg-white/[0.03]"}`}>
                    {genre}
                    {value === genre && <span className="float-right text-white/30 text-[11px]">✓</span>}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-4 py-3 text-[12px] text-white/20 text-center">No genres found</li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ExplicitCheckbox ─────────────────────────────────────────────────────────

function ExplicitCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group py-0.5">
      <div className="relative mt-[1px] shrink-0">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
        <div
          className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all duration-150
            ${checked ? "bg-white border-white" : "bg-transparent border-white/[0.15] group-hover:border-white/[0.35]"}`}
        >
          {checked && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none" aria-hidden>
              <path d="M1 3.5L3.5 6L8 1" stroke="#050A15" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <div className="select-none">
        <p className="text-[13px] text-white/50 group-hover:text-white/75 transition-colors leading-tight">
          Contains explicit content
        </p>
        <p className="text-[11px] text-white/20 mt-0.5">
          An <span className="inline-flex items-center justify-center w-[13px] h-[13px] rounded-[3px] bg-white/[0.08] border border-white/[0.12] text-[7px] font-bold text-white/40 leading-none align-middle mx-0.5">E</span> badge will appear next to the track title
        </p>
      </div>
    </label>
  );
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
            ? <Globe  size={13} strokeWidth={1.5} className="text-white/50" />
            : <Lock   size={13} strokeWidth={1.5} className="text-white/30" />
          }
        </div>
        <div className="text-left">
          <p className="text-[13px] text-white/60 group-hover:text-white/80 transition-colors leading-tight">
            {checked ? "Публичный доступ" : "Только для вас"}
          </p>
          <p className="text-[13px] text-white/40 leading-relaxed mt-1 pr-4">
            {checked
              ? "Трек открыт для всех: он будет доступен в поиске, плейлистах и рекомендациях."
              : "Трек доступен только вам. Идеально для демок и личного архива."
            }
          </p>
        </div>
      </div>

      {/* Toggle track */}
      <div className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0
        ${checked ? "bg-white/30" : "bg-white/[0.08]"}`}
      >
        <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-200
          ${checked ? "left-[22px]" : "left-[3px]"}`}
        />
      </div>
    </button>
  );
}

// ─── TrackMetadataModal ───────────────────────────────────────────────────────

export default function TrackMetadataModal(props: Props) {
  const isEdit = props.mode === "edit";
  const { onClose } = props;

  const { updateTrackInStore } = usePlayerStore();

  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError]    = useState<string | null>(null);

  const [title,       setTitle]       = useState(
    isEdit ? props.initialData.title  : titleFromFilename(props.file!.name)
  );
  const [artist,      setArtist]      = useState(
    isEdit ? props.initialData.artist : ""
  );
  const [genre,       setGenre]       = useState(
    isEdit ? (props.initialData.genre ?? "")        : ""
  );
  const [releaseDate, setReleaseDate] = useState(
    isEdit ? toDisplayDate(props.initialData.releaseDate) : ""
  );
  const [recordLabel, setRecordLabel] = useState(
    isEdit ? (props.initialData.recordLabel ?? "")  : ""
  );
  const [buyLink,     setBuyLink]     = useState(
    isEdit ? (props.initialData.buyLink ?? "")      : ""
  );
  const [isExplicit,  setIsExplicit]  = useState(
    isEdit ? props.initialData.isExplicit : false
  );
  const [isPublic,    setIsPublic]    = useState(
    isEdit ? props.initialData.isPublic : false
  );

  // ── Cover state ──────────────────────────────────────────────────────────────
  const [coverFile,    setCoverFile]    = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [cropSource,   setCropSource]   = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const cropSourceRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (cropSourceRef.current) URL.revokeObjectURL(cropSourceRef.current);
    };
  }, []);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (cropSourceRef.current) URL.revokeObjectURL(cropSourceRef.current);
    const url = URL.createObjectURL(f);
    cropSourceRef.current = url;
    setCropSource(url);
    e.target.value = "";
  };

  const handleCropConfirm = (blob: Blob) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const croppedFile = new File([blob], "cover.jpg", { type: "image/jpeg" });
    const previewUrl  = URL.createObjectURL(croppedFile);
    previewUrlRef.current = previewUrl;
    setCoverFile(croppedFile);
    setCoverPreview(previewUrl);
    if (cropSourceRef.current) URL.revokeObjectURL(cropSourceRef.current);
    cropSourceRef.current = null;
    setCropSource(null);
  };

  const handleCropCancel = () => {
    if (cropSourceRef.current) URL.revokeObjectURL(cropSourceRef.current);
    cropSourceRef.current = null;
    setCropSource(null);
  };

  const removeCover = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setCoverFile(null);
    setCoverPreview(null);
  };

  const canSubmit = title.trim().length > 0 && artist.trim().length > 0 && !isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const metadata: TrackMetadata = {
      title:       title.trim(),
      artist:      artist.trim(),
      genre:       genre       || undefined,
      releaseDate: releaseDate.trim() ? toIsoDate(releaseDate.trim()) : undefined,
      recordLabel: recordLabel.trim() || undefined,
      buyLink:     buyLink.trim()     || undefined,
      isExplicit,
      isPublic,
    };

    if (isEdit) {
      setSaveError(null);
      startTransition(async () => {
        const result = await updateTrackMetadata(props.initialData.id, metadata);
        if (result.error) { setSaveError(result.error); return; }
        // Sync in-memory player state — audioUrl is unchanged so playback continues uninterrupted.
        updateTrackInStore({ id: props.initialData.id, ...metadata });
        props.onSaved?.();
        onClose();
      });
    } else {
      props.onSubmit!(metadata, coverFile ?? undefined);
    }
  };

  return (
    <>
      {cropSource && (
        <CoverCropModal imageUrl={cropSource} onConfirm={handleCropConfirm} onClose={handleCropCancel} />
      )}

      <AnimatePresence>
        <motion.div
          key="meta-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
          className="fixed inset-0 z-[210] flex items-center justify-center p-4 backdrop-blur-md bg-black/55"
        >
          <motion.div
            key="meta-modal"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{ opacity: 0, scale: 0.97,    y: 10 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-[420px] bg-[#050A15] border border-white/[0.07] rounded-2xl shadow-2xl overflow-visible"
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] rounded-t-2xl bg-[#050A15]">
              <p className="text-[13px] font-semibold text-white/80 tracking-tight">
                {isEdit ? "Edit Track Info" : "Track details"}
              </p>
              <button type="button" onClick={onClose} className="text-white/20 hover:text-white/60 transition-colors" aria-label="Close">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-5 pt-5 pb-4 space-y-4">

                {/* ── Cover + Title / Artist ──────────────────────────── */}
                {!isEdit ? (
                  <div className="flex gap-4 items-end">
                    <div className="shrink-0 space-y-1.5">
                      <p className="text-[10px] font-medium tracking-widest uppercase text-white/25">Cover</p>
                      <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        className="sr-only" onChange={handleCoverChange} aria-label="Select cover image" />
                      <div className="relative">
                        <button type="button" onClick={() => coverInputRef.current?.click()}
                          className={`relative w-[88px] h-[88px] rounded-xl overflow-hidden border flex flex-col items-center justify-center gap-1.5 group transition-all duration-200
                            ${coverPreview ? "border-white/[0.08] hover:border-white/[0.2]" : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.16]"}`}
                          aria-label={coverPreview ? "Change cover" : "Add cover"}>
                          {coverPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <ImagePlus size={18} strokeWidth={1.25} className="text-white/20 group-hover:text-white/45 transition-colors" />
                              <span className="text-[9px] font-medium tracking-wider uppercase text-white/20 group-hover:text-white/45 transition-colors">Add Cover</span>
                            </>
                          )}
                        </button>
                        {coverPreview && (
                          <button type="button" onClick={removeCover}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#050A15] border border-white/[0.1] flex items-center justify-center hover:border-white/[0.3] transition-colors z-10"
                            aria-label="Remove cover">
                            <X size={9} strokeWidth={2.5} className="text-white/50" />
                          </button>
                        )}
                      </div>
                      <p className="text-[9px] text-white/15 text-center">3000 × 3000 px</p>
                    </div>
                    <div className="flex-1 space-y-3">
                      <Field label="Title"  value={title}  onChange={setTitle}  placeholder="Track title"  required />
                      <Field label="Artist" value={artist} onChange={setArtist} placeholder="Artist name" required />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Field label="Title"  value={title}  onChange={setTitle}  placeholder="Track title"  required />
                    <Field label="Artist" value={artist} onChange={setArtist} placeholder="Artist name" required />
                  </div>
                )}

                {/* ── Optional fields ─────────────────────────────────── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/[0.04]" />
                    <span className="text-[9px] text-white/15 uppercase tracking-widest font-medium">Optional</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>

                  {/* Genre + Release Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <GenreSelect value={genre} onChange={setGenre} />
                    <DateField value={releaseDate} onChange={setReleaseDate} />
                  </div>

                  {/* Record Label */}
                  <Field label="Record Label" value={recordLabel} onChange={setRecordLabel} placeholder="e.g. XL Recordings" />

                  {/* Buy Link */}
                  <Field label="Buy Link" value={buyLink} onChange={setBuyLink} placeholder="https://…" maxLength={500} />

                  {/* Explicit */}
                  <ExplicitCheckbox checked={isExplicit} onChange={setIsExplicit} />

                  {/* Privacy */}
                  <PrivacyToggle checked={isPublic} onChange={setIsPublic} />
                </div>
              </div>

              {/* Error */}
              {saveError && (
                <p className="px-5 pb-2 text-[12px] text-red-400/80">{saveError}</p>
              )}

              {/* Submit */}
              <div className="px-5 pb-5">
                <button type="submit" disabled={!canSubmit}
                  className="w-full bg-white text-[#050A15] text-[13px] font-semibold py-2.5 rounded-xl hover:bg-white/90 active:scale-[0.99] disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2">
                  {isPending && (
                    <span className="w-3.5 h-3.5 border border-[#050A15]/40 border-t-transparent rounded-full animate-spin" />
                  )}
                  {isEdit ? "Save Changes" : "Save & Upload"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
