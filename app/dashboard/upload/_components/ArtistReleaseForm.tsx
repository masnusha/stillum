"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter }                                 from "next/navigation";
import { motion, AnimatePresence }                   from "framer-motion";
import {
  ImagePlus, Music, X, CloudUpload,
  Loader2, GripVertical, ChevronDown, Trash2, Plus,
} from "lucide-react";
import { toast }        from "sonner";
import { v4 as uuidv4 } from "uuid";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CoverCropModal   from "@/app/dashboard/_components/CoverCropModal";
import {
  getBatchAudioPresignedUrls,
  getReleaseImagePresignedUrl,
  publishRelease,
  type AudioFileSpec,
} from "@/app/actions/release";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReleaseType = "SINGLE" | "EP" | "ALBUM";

interface TrackItem {
  id:              string;
  file:            File;
  title:           string;
  featuredArtists: string;
  duration:        number;
  loading:         boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_AUDIO_BYTES = 100 * 1024 * 1024; // 100 MB — matches server limit

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

// ─── SortableTrackRow ─────────────────────────────────────────────────────────

interface SortableTrackRowProps {
  track:      TrackItem;
  index:      number;
  isSingle:   boolean;
  expanded:   boolean;
  flashing:   boolean;
  onToggle:   (id: string) => void;
  onRemove:   (id: string) => void;
  onTitle:    (id: string, value: string) => void;
  onFeat:     (id: string, value: string) => void;
}

function SortableTrackRow({
  track,
  index,
  isSingle,
  expanded,
  flashing,
  onToggle,
  onRemove,
  onTitle,
  onFeat,
}: SortableTrackRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    zIndex:     isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "rounded-xl border overflow-hidden transition-all",
        isDragging
          ? "bg-white/[0.07] border-white/[0.14] shadow-xl opacity-75"
          : flashing
          ? "bg-amber-400/[0.06] border-amber-400/40 shadow-[0_0_18px_rgba(251,191,36,0.15)]"
          : expanded
          ? "bg-white/[0.04] border-white/[0.10]"
          : "bg-white/[0.02] border-white/[0.04] hover:border-white/[0.09]",
      ].join(" ")}
    >
      {/* ── Collapsed header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3 py-2.5">

        {/* Drag handle — isolated from the toggle click zone */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-white/[0.12] hover:text-white/35 transition-colors shrink-0 touch-none"
          aria-label="Перетащить трек"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} strokeWidth={1.5} />
        </button>

        {/* Clickable toggle row */}
        <button
          type="button"
          onClick={() => onToggle(track.id)}
          className="flex-1 flex items-center gap-3 min-w-0 text-left"
        >
          {/* Track number */}
          <span className="w-5 text-center text-[12px] font-bold text-white/20 shrink-0 tabular-nums">
            {index + 1}
          </span>

          {/* Icon */}
          <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
            {track.loading
              ? <Loader2 size={11} className="animate-spin text-white/20" />
              : <Music   size={11} strokeWidth={1.5} className="text-white/25" />
            }
          </div>

          {/* Title + feat display */}
          <div className="flex-1 min-w-0">
            <p className={`text-[13px] truncate transition-colors ${expanded ? "text-white/80" : "text-white/55"}`}>
              {track.title || <span className="text-white/20 italic">Без названия</span>}
            </p>
            {!isSingle && track.featuredArtists && (
              <p className="text-[11px] text-white/25 truncate">
                feat. {track.featuredArtists}
              </p>
            )}
          </div>

          {/* Duration */}
          <span className="text-[12px] text-white/20 tabular-nums shrink-0">
            {track.loading ? "—:——" : formatDuration(track.duration)}
          </span>

          {/* Expand chevron */}
          <ChevronDown
            size={14}
            strokeWidth={1.5}
            className={`text-white/20 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* ── Expanded panel ────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-5 pb-5 pt-3 border-t border-white/[0.05] bg-black/20 flex flex-col gap-5">

              {/* Title input */}
              <div>
                <label className={LABEL_CLS}>Название трека</label>
                <input
                  type="text"
                  value={track.title}
                  onChange={e => onTitle(track.id, e.target.value)}
                  placeholder="Введите название..."
                  autoComplete="off"
                  className={INPUT_CLS}
                />
              </div>

              {/* Feat input — hidden for SINGLE (managed by top-level field) */}
              {!isSingle && (
                <div>
                  <label className={LABEL_CLS}>Дополнительные артисты (feat.)</label>
                  <input
                    type="text"
                    value={track.featuredArtists}
                    onChange={e => onFeat(track.id, e.target.value)}
                    placeholder="Например: Drake, Pharrell Williams"
                    autoComplete="off"
                    maxLength={300}
                    className={INPUT_CLS}
                  />
                </div>
              )}

              {/* Actions row */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => onRemove(track.id)}
                  className="flex items-center gap-2 text-[12px] text-red-400/60 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                  Удалить трек
                </button>
                <button
                  type="button"
                  onClick={() => onToggle(track.id)}
                  className="text-[12px] font-medium text-white/30 hover:text-white/70 transition-colors px-4 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.18]"
                >
                  Готово
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [expandedTrackId,  setExpandedTrackId]  = useState<string | null>(null);
  const [flashingTrackId,  setFlashingTrackId]  = useState<string | null>(null);

  // Ref kept in sync with `tracks` on every render so addAudioFiles can read
  // current state synchronously without a stale closure or setTracks-as-read hack.
  const tracksRef = useRef<TrackItem[]>(tracks);
  tracksRef.current = tracks;

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

  // ── DnD sensors ───────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Collapse all tracks when a drag starts so the list stays compact while sorting
  const handleDragStart = (_event: DragStartEvent) => {
    setExpandedTrackId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTracks(prev => {
      const oldIndex = prev.findIndex(t => t.id === active.id);
      const newIndex = prev.findIndex(t => t.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const toggleTrack = (id: string) =>
    setExpandedTrackId(prev => prev === id ? null : id);

  // ── Release type constraints ───────────────────────────────────────────────
  // SINGLE: exactly 1 track  |  EP: 2–6 tracks  |  ALBUM: any count ≥ 1

  /** True when a type violates the current track count and must be locked. */
  const isTypeDisabled = (type: ReleaseType): boolean => {
    if (tracks.length === 0) return false; // no tracks yet — let artist pick freely
    if (type === "SINGLE") return tracks.length > 1;
    if (type === "EP")     return tracks.length > 6;
    return false; // ALBUM is always available
  };

  /** Inline hint shown below the segmented control when constraints are active. */
  const typeConstraintHint =
    tracks.length > 6 ? "Сингл и EP недоступны — более 6 треков" :
    tracks.length > 1 ? "Сингл недоступен — можно добавить только 1 трек" :
    "";

  // Auto-switch: keep selected type in sync as tracks are added / removed
  useEffect(() => {
    if (releaseType === "SINGLE" && tracks.length > 1) setReleaseType("EP");
    if (releaseType === "EP"     && tracks.length > 6) setReleaseType("ALBUM");
  }, [tracks.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const valid: File[] = [];
    for (const f of files) {
      const type = f.type.toLowerCase();
      const name = f.name.toLowerCase();
      const isAudio =
        type === "audio/mpeg"  || type === "audio/mp3"     ||
        type === "audio/wav"   || type === "audio/x-wav"   || type === "audio/vnd.wave" ||
        type === "audio/flac"  || type === "audio/x-flac"  ||
        name.endsWith(".mp3")  || name.endsWith(".wav")    || name.endsWith(".flac");
      if (!isAudio) continue;
      if (f.size > MAX_AUDIO_BYTES) {
        toast.error(`«${f.name}» превышает лимит 100 МБ. WAV и FLAC приветствуются, но файл слишком большой.`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length === 0) return;

    // ── Duplicate detection ────────────────────────────────────────────────
    // Read tracksRef.current — always holds the latest state synchronously,
    // so there is no stale-closure or async-ordering issue.
    const current = tracksRef.current;
    const deduplicated: File[] = [];
    let duplicateFlashId: string | null = null;

    for (const f of valid) {
      const existing = current.find(
        t => t.file.name === f.name && t.file.size === f.size
      );
      if (existing) {
        duplicateFlashId = existing.id;
      } else {
        deduplicated.push(f);
      }
    }

    // Show a single toast if any duplicates were found (one warning for the batch)
    if (deduplicated.length < valid.length) {
      const dupeCount = valid.length - deduplicated.length;
      toast.warning(
        dupeCount === 1
          ? "Этот файл уже добавлен в релиз"
          : `${dupeCount} файла уже добавлены в релиз`,
        { duration: 3000 },
      );
      // Flash the last found duplicate in the list
      if (duplicateFlashId) {
        setFlashingTrackId(duplicateFlashId);
        setTimeout(() => setFlashingTrackId(null), 900);
      }
    }

    if (deduplicated.length === 0) return;

    const newItems: TrackItem[] = deduplicated.map(f => ({
      id:              uuidv4(),
      file:            f,
      title:           prettyTitle(f.name),
      featuredArtists: "",
      duration:        0,
      loading:         true,
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

  const removeTrack      = (id: string) => setTracks(prev => prev.filter(t => t.id !== id));
  const updateTrackTitle = (id: string, title: string) =>
    setTracks(prev => prev.map(t => t.id === id ? { ...t, title } : t));
  const updateTrackFeat  = (id: string, featuredArtists: string) =>
    setTracks(prev => prev.map(t => t.id === id ? { ...t, featuredArtists } : t));

  // ── Submit ─────────────────────────────────────────────────────────────────

  const canSubmit =
    releaseName.trim().length > 0 &&
    !!coverFile &&
    tracks.length > 0 &&
    !(releaseType === "SINGLE" && tracks.length !== 1) &&
    !(releaseType === "EP"     && tracks.length > 6)  &&
    !isSubmitting;

  const triggerCoverShake = () => {
    setCoverShake(true);
    setTimeout(() => setCoverShake(false), 900);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!coverFile) {
      triggerCoverShake();
      toast.error("Обложка — обязательная часть релиза. Пожалуйста, добавьте изображение.");
      return;
    }

    if (!canSubmit) return;

    setIsSubmitting(true);

    try {
      // ── Step 1: Upload cover ──────────────────────────────────────────────
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

      // ── Step 2: Batch-presign all audio files (one DB hit for N tracks) ─────
      // Calling a separate server action per track would fire N sequential DB
      // session lookups and exhaust Railway's connection pool. One batch call
      // validates the session once, returns all presigned URLs, then we upload
      // directly to S3 sequentially without touching the DB again.
      setSubmitMessage("Подготовка к загрузке треков...");

      const specs: AudioFileSpec[] = tracks.map(t => ({
        fileName: t.file.name,
        fileType: t.file.type,
        fileSize: t.file.size,
      }));

      const batchPresign = await getBatchAudioPresignedUrls(specs);
      if ("error" in batchPresign) throw new Error(batchPresign.error);

      // ── Step 3: Upload audio files sequentially to S3 (no DB involved) ──────
      const uploadedTracks: {
        fileKey: string; title: string; duration: number;
        featuredArtists?: string; order: number;
      }[] = [];

      for (let i = 0; i < tracks.length; i++) {
        const track      = tracks[i];
        const presignItem = batchPresign.items[i];
        if (!track || !presignItem) continue;

        setSubmitMessage(`Загрузка треков... ${i + 1} / ${tracks.length}`);

        const res = await fetch(presignItem.presignedUrl, {
          method:  "PUT",
          body:    track.file,
          headers: { "Content-Type": presignItem.contentType },
        });
        if (!res.ok) throw new Error(`Не удалось загрузить трек «${track.title}».`);

        // For SINGLE: feat. comes from the top-level global field (not per-track).
        // For EP/ALBUM: each track has its own independent feat. input.
        const trackFeat = releaseType === "SINGLE"
          ? featuredArtists.trim() || undefined
          : track.featuredArtists.trim() || undefined;

        uploadedTracks.push({
          fileKey:         presignItem.fileKey,
          title:           track.title,
          duration:        track.duration,
          featuredArtists: trackFeat,
          order:           i,
        });
      }

      // ── Step 4: Create Album + Tracks in DB ───────────────────────────────
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

      toast.success("Релиз успешно опубликован 🎧");
      router.push("/dashboard/studio");

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
                {(["SINGLE", "EP", "ALBUM"] as ReleaseType[]).map(type => {
                  const locked = isTypeDisabled(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={locked}
                      onClick={() => setReleaseType(type)}
                      className={[
                        "px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200",
                        locked
                          ? "opacity-25 cursor-not-allowed"
                          : releaseType === type
                          ? "bg-white text-black shadow-sm"
                          : "text-white/40 hover:text-white/80",
                      ].join(" ")}
                    >
                      {RELEASE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
              {/* Constraint hint — appears only when track count violates a type rule */}
              {typeConstraintHint && (
                <p className="mt-2 text-[11px] text-white/25 tracking-wide">
                  {typeConstraintHint}
                </p>
              )}
            </div>

            {/* ── Release Details grid ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 mb-10">

              {/*
                Featured artists — SINGLE only.
                For EP/ALBUM the feat. credits live per-track in the tracklist below,
                so this field would be redundant and confusing.
              */}
              {releaseType === "SINGLE" && (
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
              )}

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

              {/* Label — spans full width for EP/ALBUM (4 fields → 2×2), stays 1 col for SINGLE */}
              <div className={releaseType !== "SINGLE" ? "" : ""}>
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

            {/* Hidden file input — shared by both the big drop zone and the compact add button */}
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/mpeg,audio/wav,.mp3,.wav,.flac"
              multiple
              className="sr-only"
              onChange={handleAudioChange}
            />

            {/* ── Audio section: adapts based on whether tracks exist ────────── */}
            <AnimatePresence mode="wait" initial={false}>
              {tracks.length === 0 ? (

                /* ── Empty state: large drop zone ──────────────────────────── */
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
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
                  <p className="text-[12px] text-white/20 mt-1.5">WAV · FLAC · MP3 &nbsp;·&nbsp; макс. 100 МБ на файл</p>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); audioInputRef.current?.click(); }}
                    className="mt-4 px-5 py-2 rounded-full border border-white/10 text-[12px] font-medium text-white/35 hover:text-white/65 hover:border-white/25 transition-all"
                  >
                    Выбрать файлы
                  </button>
                </motion.div>

              ) : (

                /* ── Non-empty: sortable tracklist + compact add button ─────── */
                <motion.div
                  key="tracklist"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onDragOver={e => { e.preventDefault(); setAudioDragging(true); }}
                  onDragLeave={() => setAudioDragging(false)}
                  onDrop={handleAudioDrop}
                  className={[
                    "rounded-2xl transition-all p-1",
                    audioDragging
                      ? "ring-2 ring-white/20 ring-inset bg-white/[0.02]"
                      : "",
                  ].join(" ")}
                >
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={tracks.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-1">
                        {tracks.map((track, i) => (
                          <SortableTrackRow
                            key={track.id}
                            track={track}
                            index={i}
                            isSingle={releaseType === "SINGLE"}
                            expanded={expandedTrackId === track.id}
                            flashing={flashingTrackId === track.id}
                            onToggle={toggleTrack}
                            onRemove={removeTrack}
                            onTitle={updateTrackTitle}
                            onFeat={updateTrackFeat}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* Compact add button — hidden for SINGLE once a track is loaded */}
                  {!(releaseType === "SINGLE" && tracks.length >= 1) && (
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      className="w-full mt-2 py-4 border-2 border-dashed border-white/[0.06] rounded-xl text-white/30 text-sm font-medium hover:border-white/20 hover:text-white/60 transition-all flex items-center justify-center gap-2 bg-white/[0.01] hover:bg-white/[0.03]"
                    >
                      <Plus size={15} strokeWidth={1.5} />
                      Добавить трек
                    </button>
                  )}
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
                      : releaseType === "SINGLE" && tracks.length !== 1
                      ? "Сингл должен содержать ровно 1 трек"
                      : releaseType === "EP" && tracks.length > 6
                      ? "EP не может содержать более 6 треков"
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
