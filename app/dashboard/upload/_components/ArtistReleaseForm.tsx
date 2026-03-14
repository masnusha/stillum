"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter }                                 from "next/navigation";
import { motion, AnimatePresence }                   from "framer-motion";
import {
  ImagePlus, Music, X, CloudUpload,
  Loader2, GripVertical, ChevronDown,
} from "lucide-react";
import { toast }        from "sonner";
import { v4 as uuidv4 } from "uuid";
import CoverCropModal   from "@/app/dashboard/_components/CoverCropModal";
import {
  getReleaseAudioPresignedUrl,
  getReleaseImagePresignedUrl,
  publishRelease,
} from "@/app/actions/release";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReleaseType = "SINGLE" | "EP" | "ALBUM";

interface TrackItem {
  id:       string;
  file:     File;
  title:    string;
  duration: number;
  loading:  boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RELEASE_LABELS: Record<ReleaseType, string> = {
  SINGLE: "Сингл",
  EP:     "EP",
  ALBUM:  "Альбом",
};

const GENRES = [
  "Ambient", "Blues", "Classical", "Country", "Dance",
  "Drum & Bass", "Electronic", "Experimental", "Folk",
  "Funk", "Hard Rock", "Hip-Hop", "House", "Indie",
  "Jazz", "Latin", "Lo-Fi", "Metal", "Minimal",
  "Neo Soul", "Pop", "Post-Rock", "Punk", "R&B",
  "Reggae", "Rock", "Soul", "Synth-Pop", "Techno",
  "Trance", "Trap", "World",
] as const;

const LANGUAGES = [
  "Русский",
  "Английский",
  "Испанский",
  "Французский",
  "Немецкий",
  "Корейский",
  "Японский",
  "Арабский",
  "Португальский",
  "Инструментал",
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prettyTitle(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDuration(secs: number): string {
  if (secs <= 0) return "—:——";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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

// ─── Shared field styles ──────────────────────────────────────────────────────

const LABEL_CLS =
  "block text-[10px] font-bold tracking-widest text-white/40 uppercase mb-2";

const INPUT_CLS =
  "w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm " +
  "placeholder:text-white/20 focus:border-white/50 focus:bg-white/[0.05] transition-all outline-none";

// ─── SelectField ──────────────────────────────────────────────────────────────

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  options:     readonly string[];
  placeholder: string;
}) {
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          // color-scheme: dark makes the native dropdown adopt dark OS styling
          style={{ colorScheme: "dark" }}
          className={INPUT_CLS + " appearance-none pr-10 cursor-pointer"}
        >
          <option value="" disabled hidden>{placeholder}</option>
          {options.map(opt => (
            <option key={opt} value={opt}
              style={{ background: "#050A15", color: "rgba(255,255,255,0.8)" }}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
        />
      </div>
    </div>
  );
}

// ─── ArtistReleaseForm ────────────────────────────────────────────────────────

export default function ArtistReleaseForm() {
  const router = useRouter();

  // ── Core release fields ────────────────────────────────────────────────────
  const [releaseName,      setReleaseName]      = useState("");
  const [releaseType,      setReleaseType]      = useState<ReleaseType>("SINGLE");

  // ── Extended metadata ──────────────────────────────────────────────────────
  const [featuredArtists,  setFeaturedArtists]  = useState("");
  const [genre,            setGenre]            = useState("");
  const [releaseDate,      setReleaseDate]      = useState("");
  const [language,         setLanguage]         = useState("");
  const [label,            setLabel]            = useState("");

  // ── Cover ──────────────────────────────────────────────────────────────────
  const [coverFile,        setCoverFile]        = useState<File | null>(null);
  const [coverPreview,     setCoverPreview]     = useState<string | null>(null);
  const [cropSource,       setCropSource]       = useState<string | null>(null);
  const [coverDragging,    setCoverDragging]    = useState(false);

  // ── Tracks ─────────────────────────────────────────────────────────────────
  const [tracks,           setTracks]           = useState<TrackItem[]>([]);
  const [audioDragging,    setAudioDragging]    = useState(false);

  // ── Submission ─────────────────────────────────────────────────────────────
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [submitMessage,    setSubmitMessage]    = useState("");
  const [coverShake,       setCoverShake]       = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const cropSourceRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (cropSourceRef.current) URL.revokeObjectURL(cropSourceRef.current);
    };
  }, []);

  // ── Cover handlers ─────────────────────────────────────────────────────────

  const openCoverPicker = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    coverInputRef.current?.click();
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (cropSourceRef.current) URL.revokeObjectURL(cropSourceRef.current);
    const url = URL.createObjectURL(f);
    cropSourceRef.current = url;
    setCropSource(url);
    e.target.value = "";
  };

  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCoverDragging(false);
    const f = e.dataTransfer.files[0];
    if (!f || !f.type.startsWith("image/")) return;
    if (cropSourceRef.current) URL.revokeObjectURL(cropSourceRef.current);
    const url = URL.createObjectURL(f);
    cropSourceRef.current = url;
    setCropSource(url);
  };

  const handleCropConfirm = (blob: Blob) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const cropped = new File([blob], "cover.jpg", { type: "image/jpeg" });
    const preview = URL.createObjectURL(cropped);
    previewUrlRef.current = preview;
    setCoverFile(cropped);
    setCoverPreview(preview);
    if (cropSourceRef.current) URL.revokeObjectURL(cropSourceRef.current);
    cropSourceRef.current = null;
    setCropSource(null);
  };

  const handleCropCancel = () => {
    if (cropSourceRef.current) URL.revokeObjectURL(cropSourceRef.current);
    cropSourceRef.current = null;
    setCropSource(null);
  };

  const removeCover = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setCoverFile(null);
    setCoverPreview(null);
  };

  // ── Audio handlers ─────────────────────────────────────────────────────────

  const addAudioFiles = useCallback(async (files: File[]) => {
    const valid = files.filter(f =>
      f.type === "audio/mpeg" ||
      f.type === "audio/wav"  ||
      f.type === "audio/flac" ||
      f.name.endsWith(".mp3") ||
      f.name.endsWith(".wav") ||
      f.name.endsWith(".flac")
    );
    if (valid.length === 0) return;

    const newItems: TrackItem[] = valid.map(f => ({
      id:       uuidv4(),
      file:     f,
      title:    prettyTitle(f.name),
      duration: 0,
      loading:  true,
    }));

    setTracks(prev => [...prev, ...newItems]);

    for (const item of newItems) {
      const duration = await getAudioDuration(item.file);
      setTracks(prev =>
        prev.map(t => t.id === item.id ? { ...t, duration, loading: false } : t)
      );
    }
  }, []);

  const handleAudioDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setAudioDragging(false);
    void addAudioFiles(Array.from(e.dataTransfer.files));
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void addAudioFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const removeTrack    = (id: string)              => setTracks(prev => prev.filter(t => t.id !== id));
  const updateTrackTitle = (id: string, title: string) =>
    setTracks(prev => prev.map(t => t.id === id ? { ...t, title } : t));

  // ── Submit ─────────────────────────────────────────────────────────────────

  const canSubmit =
    releaseName.trim().length > 0 &&
    !!coverFile &&
    tracks.length > 0 &&
    !isSubmitting;

  /** Pulse red glow on the cover zone when submit is attempted without a cover. */
  const triggerCoverShake = () => {
    setCoverShake(true);
    setTimeout(() => setCoverShake(false), 900);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side cover guard — pulse the zone and bail early
    if (!coverFile) {
      triggerCoverShake();
      toast.error("Обложка — обязательная часть релиза. Пожалуйста, добавьте изображение.");
      return;
    }

    if (!canSubmit) return;

    setIsSubmitting(true);

    try {
      // ── Step 1: Upload cover (optional) ──────────────────────────────────
      let coverKey: string | undefined;

      if (coverFile) {
        setSubmitMessage("Загрузка обложки...");
        const coverPresign = await getReleaseImagePresignedUrl(coverFile.type, coverFile.size);
        if ("error" in coverPresign) throw new Error(coverPresign.error);

        const res = await fetch(coverPresign.presignedUrl, {
          method:  "PUT",
          body:    coverFile,
          headers: { "Content-Type": coverFile.type },
        });
        if (!res.ok) throw new Error("Не удалось загрузить обложку.");
        coverKey = coverPresign.fileKey;
      }

      // ── Step 2: Upload audio files ────────────────────────────────────────
      const uploadedTracks: { fileKey: string; title: string; duration: number }[] = [];

      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (!track) continue;
        setSubmitMessage(`Загрузка треков... ${i + 1} / ${tracks.length}`);

        const audioPresign = await getReleaseAudioPresignedUrl(
          track.file.name,
          track.file.type,
          track.file.size,
        );
        if ("error" in audioPresign) throw new Error(audioPresign.error);

        const res = await fetch(audioPresign.presignedUrl, {
          method:  "PUT",
          body:    track.file,
          headers: { "Content-Type": track.file.type },
        });
        if (!res.ok) throw new Error(`Не удалось загрузить трек «${track.title}».`);

        uploadedTracks.push({
          fileKey:  audioPresign.fileKey,
          title:    track.title,
          duration: track.duration,
        });
      }

      // ── Step 3: Create Album + Tracks in DB ───────────────────────────────
      setSubmitMessage("Сохранение релиза...");

      const result = await publishRelease({
        title:           releaseName.trim(),
        type:            releaseType,
        coverKey,
        featuredArtists: featuredArtists.trim() || undefined,
        genre:           genre           || undefined,
        releaseDate:     releaseDate     || undefined,
        language:        language        || undefined,
        label:           label.trim()    || undefined,
        tracks:          uploadedTracks,
      });

      if ("error" in result) {
        if (result.error === "cover_required") {
          triggerCoverShake();
          throw new Error("Обложка — обязательная часть релиза. Пожалуйста, добавьте изображение.");
        }
        throw new Error(result.error);
      }

      // ── Step 4: Success ───────────────────────────────────────────────────
      toast.success("Релиз успешно опубликован 🎧");
      router.push("/dashboard/profile");

    } catch (err) {
      const message = err instanceof Error ? err.message : "Произошла ошибка при публикации.";
      toast.error(message);
      setIsSubmitting(false);
      setSubmitMessage("");
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {cropSource && (
        <CoverCropModal
          imageUrl={cropSource}
          onConfirm={handleCropConfirm}
          onClose={handleCropCancel}
        />
      )}

      <form onSubmit={handleSubmit}>
        <h1 className="text-3xl font-bold text-white mb-10">Новый релиз</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-10 xl:gap-16">

          {/* ── Left: Cover ───────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleCoverChange}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => !coverPreview && openCoverPicker()}
              onKeyDown={e => e.key === "Enter" && !coverPreview && openCoverPicker()}
              onDragOver={e => { e.preventDefault(); setCoverDragging(true); }}
              onDragLeave={() => setCoverDragging(false)}
              onDrop={handleCoverDrop}
              className={[
                "w-full aspect-square rounded-3xl border-2 border-dashed",
                "flex flex-col items-center justify-center overflow-hidden relative outline-none transition-all",
                coverShake
                  ? "border-red-500/50 shadow-[0_0_24px_rgba(239,68,68,0.25)] animate-pulse"
                  : coverPreview
                  ? "border-white/10 cursor-default group"
                  : coverDragging
                  ? "border-white/40 bg-white/[0.06] cursor-copy"
                  : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05] cursor-pointer group",
              ].join(" ")}
            >
              {coverPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="Release cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={openCoverPicker}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white/90 hover:bg-white/20 transition-colors backdrop-blur-sm"
                    >
                      <ImagePlus size={14} strokeWidth={1.5} />
                      Изменить
                    </button>
                    <button
                      type="button"
                      onClick={removeCover}
                      className="text-xs text-white/35 hover:text-white/70 transition-colors underline underline-offset-2"
                    >
                      Удалить обложку
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <ImagePlus
                    className={[
                      "w-12 h-12 mb-3 transition-all",
                      coverDragging
                        ? "text-white/50 scale-110"
                        : "text-white/20 group-hover:text-white/35 group-hover:scale-110",
                    ].join(" ")}
                    strokeWidth={0.75}
                  />
                  <p className="text-[14px] font-medium text-white/35 group-hover:text-white/55 transition-colors">
                    {coverDragging ? "Отпустите изображение" : "Загрузить обложку (High-Res)"}
                  </p>
                  <p className="text-[11px] text-white/15 mt-1.5">3000 × 3000 px рекомендуется</p>
                </>
              )}
            </div>
            <p className="text-[10px] text-white/15 text-center tracking-widest uppercase">
              JPEG &nbsp;·&nbsp; PNG &nbsp;·&nbsp; WebP &nbsp;·&nbsp; макс. 10 MB
            </p>
          </div>

          {/* ── Right: Metadata + Tracks ───────────────────────────────────── */}
          <div className="flex flex-col">

            {/* Release title */}
            <input
              type="text"
              value={releaseName}
              onChange={e => setReleaseName(e.target.value)}
              placeholder="Название релиза..."
              maxLength={200}
              autoComplete="off"
              className="text-4xl md:text-5xl font-black bg-transparent border-b-2 border-white/10 focus:border-white w-full py-4 text-white placeholder:text-white/20 transition-colors duration-200 focus:outline-none mb-8"
            />

            {/* Release type: Segmented Control */}
            <div className="mb-8">
              <p className={LABEL_CLS}>Тип релиза</p>
              <div className="flex p-1 bg-white/[0.05] rounded-xl w-fit gap-0.5">
                {(["SINGLE", "EP", "ALBUM"] as ReleaseType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setReleaseType(type)}
                    className={[
                      "px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200",
                      releaseType === type
                        ? "bg-white text-black shadow-sm"
                        : "text-white/40 hover:text-white/80",
                    ].join(" ")}
                  >
                    {RELEASE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Release Details grid ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 mb-10">

              {/* Featured artists */}
              <div className="md:col-span-2">
                <label htmlFor="feat" className={LABEL_CLS}>Дополнительные артисты (feat.)</label>
                <input
                  id="feat"
                  type="text"
                  value={featuredArtists}
                  onChange={e => setFeaturedArtists(e.target.value)}
                  placeholder="Например: Travis Scott, Drake"
                  maxLength={300}
                  autoComplete="off"
                  className={INPUT_CLS}
                />
              </div>

              {/* Genre */}
              <SelectField
                label="Жанр"
                value={genre}
                onChange={setGenre}
                options={GENRES}
                placeholder="Выбрать жанр..."
              />

              {/* Language */}
              <SelectField
                label="Язык релиза"
                value={language}
                onChange={setLanguage}
                options={LANGUAGES}
                placeholder="Выбрать язык..."
              />

              {/* Release date */}
              <div>
                <label htmlFor="rdate" className={LABEL_CLS}>Дата релиза</label>
                <input
                  id="rdate"
                  type="date"
                  value={releaseDate}
                  onChange={e => setReleaseDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className={INPUT_CLS + " cursor-pointer"}
                />
              </div>

              {/* Label */}
              <div>
                <label htmlFor="lbl" className={LABEL_CLS}>Лейбл</label>
                <input
                  id="lbl"
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="Название лейбла или (C) 2026 Independent"
                  maxLength={200}
                  autoComplete="off"
                  className={INPUT_CLS}
                />
              </div>

            </div>

            {/* ── Audio drop zone ───────────────────────────────────────────── */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => audioInputRef.current?.click()}
              onKeyDown={e => e.key === "Enter" && audioInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setAudioDragging(true); }}
              onDragLeave={() => setAudioDragging(false)}
              onDrop={handleAudioDrop}
              className={[
                "relative rounded-2xl p-8 flex flex-col items-center text-center",
                "cursor-pointer outline-none transition-all",
                audioDragging
                  ? "bg-white/[0.06] border border-white/30"
                  : "bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05]",
              ].join(" ")}
            >
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/mpeg,audio/wav,.mp3,.wav,.flac"
                multiple
                className="sr-only"
                onChange={handleAudioChange}
              />
              <CloudUpload
                className={[
                  "w-10 h-10 mb-3 transition-all",
                  audioDragging ? "text-white/60 scale-110" : "text-white/20",
                ].join(" ")}
                strokeWidth={0.75}
              />
              <p className="text-[15px] font-medium text-white/45">
                {audioDragging ? "Отпустите файлы" : "Перетащите мастер-файлы (WAV, FLAC, MP3) сюда"}
              </p>
              <p className="text-[12px] text-white/20 mt-1.5">макс. 15 MB на файл</p>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); audioInputRef.current?.click(); }}
                className="mt-4 px-5 py-2 rounded-full border border-white/10 text-[12px] font-medium text-white/35 hover:text-white/65 hover:border-white/25 transition-all"
              >
                Выбрать файлы
              </button>
            </div>

            {/* ── Track list ────────────────────────────────────────────────── */}
            <AnimatePresence>
              {tracks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{   opacity: 0, height: 0    }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-1 pt-3">
                    {tracks.map((track, i) => (
                      <motion.div
                        key={track.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0   }}
                        exit={{   opacity: 0, x:  10  }}
                        transition={{ duration: 0.18 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.09] group transition-colors"
                      >
                        <GripVertical size={14} strokeWidth={1.5} className="text-white/[0.12] shrink-0 cursor-grab" />
                        <span className="w-5 text-center text-[12px] font-bold text-white/20 shrink-0 tabular-nums select-none">
                          {i + 1}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                          {track.loading
                            ? <Loader2 size={12} className="animate-spin text-white/20" />
                            : <Music   size={12} strokeWidth={1.5} className="text-white/25" />
                          }
                        </div>
                        <input
                          type="text"
                          value={track.title}
                          onChange={e => updateTrackTitle(track.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="flex-1 min-w-0 bg-transparent text-[13px] text-white/65 focus:text-white placeholder:text-white/20 focus:outline-none transition-colors"
                          aria-label={`Название трека ${i + 1}`}
                        />
                        <span className="text-[12px] text-white/20 tabular-nums shrink-0 select-none">
                          {track.loading ? "—:——" : formatDuration(track.duration)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTrack(track.id)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/70 transition-all"
                          aria-label="Убрать трек"
                        >
                          <X size={14} strokeWidth={1.5} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Submit ────────────────────────────────────────────────────── */}
            <div className="mt-10 flex flex-col items-start gap-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className={[
                  "px-10 py-4 bg-white text-black font-bold rounded-full text-lg",
                  "flex items-center gap-3 transition-all duration-200",
                  "disabled:cursor-not-allowed",
                  isSubmitting
                    ? "opacity-80 scale-[0.99]"
                    : "hover:scale-105 active:scale-[0.98] disabled:opacity-25 disabled:hover:scale-100",
                ].join(" ")}
              >
                {isSubmitting
                  ? <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  : null
                }
                {isSubmitting ? "Мастеринг и выгрузка..." : "Выпустить релиз"}
              </button>

              {/* Dynamic status message during upload */}
              <AnimatePresence mode="wait">
                {isSubmitting && submitMessage ? (
                  <motion.p
                    key={submitMessage}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1,  y:  0 }}
                    exit={{   opacity: 0,  y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="text-[12px] text-white/30 flex items-center gap-1.5"
                  >
                    <span className="inline-block w-1 h-1 rounded-full bg-white/30 animate-pulse" />
                    {submitMessage}
                  </motion.p>
                ) : !canSubmit && !isSubmitting ? (
                  <motion.p
                    key="hint"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1,  y:  0 }}
                    exit={{   opacity: 0,  y: -4 }}
                    className="text-[12px] text-white/20"
                  >
                    {releaseName.trim().length === 0
                      ? "Добавьте название релиза"
                      : !coverFile
                      ? "Добавьте обложку релиза"
                      : tracks.length === 0
                      ? "Добавьте хотя бы один трек"
                      : ""}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </form>
    </>
  );
}
