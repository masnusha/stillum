"use client";

import { useState }  from "react";
import { useRouter } from "next/navigation";
import Image         from "next/image";
import Link          from "next/link";
import {
  ArrowLeft, Music, Pencil, Trash2,
  X, Check, Loader2, ShieldCheck, GripVertical, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
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
import { AnimatePresence, motion } from "framer-motion";
import { updateReleaseFull, deleteRelease } from "@/app/actions/release";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrackRow {
  id:              string;
  title:           string;
  featuredArtists: string | null;
  duration:        number;
}

export interface AlbumDetail {
  id:              string;
  title:           string;
  type:            string;
  coverImage:      string | null;
  releaseDate:     string | null;
  featuredArtists: string | null;
  genre:           string | null;
  language:        string | null;
  label:           string | null;
  tracks:          TrackRow[];
  totalDuration:   number;
}

interface EditTrackState {
  id:              string;
  title:           string;
  featuredArtists: string;
  duration:        number; // display only
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  SINGLE: "Сингл",
  EP:     "EP",
  ALBUM:  "Альбом",
};

function formatDate(raw: string | null | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw.length === 10 ? raw + "T00:00:00" : raw);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function formatDuration(secs: number): string {
  if (secs <= 0) return "—:——";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const LABEL_CLS =
  "block text-[10px] font-black tracking-[0.18em] text-white/25 uppercase mb-1.5";

const INPUT_CLS =
  "w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 py-2.5 text-white text-[14px] " +
  "placeholder:text-white/20 focus:border-white/40 focus:bg-white/[0.07] transition-all outline-none";

// ─── Save confirmation modal ──────────────────────────────────────────────────

function SaveConfirmModal({
  albumTitle,
  isSaving,
  onConfirm,
  onCancel,
}: {
  albumTitle: string;
  isSaving:   boolean;
  onConfirm:  () => void;
  onCancel:   () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(3,7,18,0.80)", backdropFilter: "blur(8px)" }}
    >
      <div className="w-full max-w-sm bg-[#0D1526] border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center mb-6">
          <ShieldCheck size={20} strokeWidth={1.5} className="text-white/60" />
        </div>
        <h2 className="text-[18px] font-bold text-white mb-2 tracking-tight">
          Сохранить изменения?
        </h2>
        <p className="text-[13px] text-white/40 leading-relaxed mb-8">
          Вы уверены, что хотите сохранить изменения в релизе{" "}
          <span className="text-white/70 font-semibold">«{albumTitle}»</span>?
          Это обновит метаданные альбома, все изменённые треки и их порядок.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-full border border-white/[0.10] text-[12px] font-medium text-white/50 hover:text-white/80 hover:border-white/25 transition-all disabled:opacity-40"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-full bg-white text-black text-[12px] font-bold flex items-center gap-2 hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
            {isSaving ? "Сохраняем…" : "Подтвердить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirmation modal ────────────────────────────────────────────────

function DeleteModal({
  albumTitle,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  albumTitle: string;
  isDeleting: boolean;
  onConfirm:  () => void;
  onCancel:   () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(3,7,18,0.80)", backdropFilter: "blur(8px)" }}
    >
      <div className="w-full max-w-md bg-[#0D1526] border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-red-500/[0.10] border border-red-500/[0.20] flex items-center justify-center mb-6">
          <Trash2 size={20} strokeWidth={1.5} className="text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-3 tracking-tight">Удаление релиза</h2>
        <p className="text-[14px] text-white/45 leading-relaxed mb-8">
          Вы действительно хотите удалить{" "}
          <span className="text-white/75 font-semibold">«{albumTitle}»</span>{" "}
          из Stillum? Это действие необратимо — все треки и файлы будут безвозвратно удалены.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-full border border-white/[0.10] text-[13px] font-medium text-white/60 hover:text-white/90 hover:border-white/25 transition-all disabled:opacity-40"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-full bg-red-500/90 hover:bg-red-500 text-white text-[13px] font-semibold flex items-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} strokeWidth={1.5} />}
            {isDeleting ? "Удаляем…" : "Да, удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SortableEditTrackRow ─────────────────────────────────────────────────────

interface SortableEditTrackRowProps {
  track:    EditTrackState;
  index:    number;
  isSingle: boolean;
  expanded: boolean;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onTitle:  (id: string, v: string) => void;
  onFeat:   (id: string, v: string) => void;
}

function SortableEditTrackRow({
  track, index, isSingle, expanded,
  onToggle, onRemove, onTitle, onFeat,
}: SortableEditTrackRowProps) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex:    isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "rounded-xl border overflow-hidden transition-all",
        isDragging
          ? "bg-white/[0.07] border-white/[0.14] shadow-xl opacity-75"
          : expanded
          ? "bg-white/[0.04] border-white/[0.10]"
          : "bg-white/[0.02] border-white/[0.04] hover:border-white/[0.09]",
      ].join(" ")}
    >
      {/* Collapsed header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-white/[0.12] hover:text-white/35 transition-colors shrink-0 touch-none"
          aria-label="Перетащить трек"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} strokeWidth={1.5} />
        </button>

        <button
          type="button"
          onClick={() => onToggle(track.id)}
          className="flex-1 flex items-center gap-3 min-w-0 text-left"
        >
          <span className="w-5 text-center text-[12px] font-bold text-white/20 shrink-0 tabular-nums">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`text-[13px] truncate transition-colors ${expanded ? "text-white/80" : "text-white/55"}`}>
              {track.title || <span className="italic text-white/20">Без названия</span>}
            </p>
            {!isSingle && track.featuredArtists && (
              <p className="text-[11px] text-white/25 truncate">feat. {track.featuredArtists}</p>
            )}
          </div>
          <span className="text-[12px] text-white/20 tabular-nums shrink-0">
            {formatDuration(track.duration)}
          </span>
          <ChevronDown
            size={14}
            strokeWidth={1.5}
            className={`text-white/20 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Expanded panel */}
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
            <div className="px-5 pb-5 pt-3 border-t border-white/[0.05] bg-black/20 flex flex-col gap-4">
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

// ─── ReleaseDetailClient ──────────────────────────────────────────────────────

export default function ReleaseDetailClient({ album }: { album: AlbumDetail }) {
  const router = useRouter();
  const isSingle = album.type === "SINGLE";

  // ── Album metadata edit state ──────────────────────────────────────────────
  const [isEditing,    setIsEditing]    = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [editTitle,    setEditTitle]    = useState(album.title);
  const [editFeat,     setEditFeat]     = useState(album.featuredArtists ?? "");
  const [editGenre,    setEditGenre]    = useState(album.genre ?? "");
  const [editLanguage, setEditLanguage] = useState(album.language ?? "");
  const [editLabel,    setEditLabel]    = useState(album.label ?? "");

  // ── Editable tracklist state ───────────────────────────────────────────────
  const [editTracks, setEditTracks] = useState<EditTrackState[]>(() =>
    album.tracks.map(t => ({
      id:              t.id,
      title:           t.title,
      featuredArtists: t.featuredArtists ?? "",
      duration:        t.duration,
    }))
  );
  const [expandedEditTrackId, setExpandedEditTrackId] = useState<string | null>(null);

  // ── DnD sensors ───────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleTrackDragStart = (_e: DragStartEvent) => setExpandedEditTrackId(null);

  const handleTrackDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setEditTracks(prev => {
      const oldIdx = prev.findIndex(t => t.id === active.id);
      const newIdx = prev.findIndex(t => t.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const toggleEditTrack  = (id: string) => setExpandedEditTrackId(p => p === id ? null : id);
  const removeEditTrack  = (id: string) => setEditTracks(prev => prev.filter(t => t.id !== id));
  const updateEditTitle  = (id: string, v: string) => setEditTracks(prev => prev.map(t => t.id === id ? { ...t, title: v } : t));
  const updateEditFeat   = (id: string, v: string) => setEditTracks(prev => prev.map(t => t.id === id ? { ...t, featuredArtists: v } : t));

  // ── Modal state ────────────────────────────────────────────────────────────
  const [showSaveModal,   setShowSaveModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting,      setIsDeleting]      = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCancel = () => {
    setEditTitle(album.title);
    setEditFeat(album.featuredArtists ?? "");
    setEditGenre(album.genre ?? "");
    setEditLanguage(album.language ?? "");
    setEditLabel(album.label ?? "");
    setEditTracks(album.tracks.map(t => ({
      id: t.id, title: t.title,
      featuredArtists: t.featuredArtists ?? "",
      duration: t.duration,
    })));
    setExpandedEditTrackId(null);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!editTitle.trim()) return;
    setShowSaveModal(true);
  };

  const handleSaveConfirm = async () => {
    setIsSaving(true);
    const result = await updateReleaseFull(album.id, {
      title:           editTitle,
      featuredArtists: editFeat     || undefined,
      genre:           editGenre    || undefined,
      language:        editLanguage || undefined,
      label:           editLabel    || undefined,
      tracks: editTracks.map((t, i) => ({
        id:              t.id,
        title:           t.title,
        featuredArtists: t.featuredArtists || undefined,
        order:           i,
      })),
    });
    setIsSaving(false);
    setShowSaveModal(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setIsEditing(false);
      setExpandedEditTrackId(null);
      toast.success("Релиз обновлён");
      router.refresh();
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    const result = await deleteRelease(album.id);
    if ("error" in result) {
      setIsDeleting(false);
      setShowDeleteModal(false);
      toast.error(result.error);
    } else {
      toast.success("Релиз удалён");
      router.push("/dashboard/studio");
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const totalEditDuration = editTracks.reduce((s, t) => s + t.duration, 0);

  return (
    <>
      {showSaveModal && (
        <SaveConfirmModal
          albumTitle={editTitle || album.title}
          isSaving={isSaving}
          onConfirm={handleSaveConfirm}
          onCancel={() => setShowSaveModal(false)}
        />
      )}
      {showDeleteModal && (
        <DeleteModal
          albumTitle={album.title}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Back link */}
      <Link
        href="/dashboard/studio"
        className="inline-flex items-center gap-2 text-[13px] text-white/40 hover:text-white/80 transition-colors mb-10 group"
      >
        <ArrowLeft size={14} strokeWidth={1.5} className="group-hover:-translate-x-0.5 transition-transform" />
        Назад в каталог
      </Link>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-10 xl:gap-16">

        {/* ── Left: cover + stats ─────────────────────────────────────────── */}
        <div>
          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.06] shadow-2xl mb-6 flex items-center justify-center">
            {album.coverImage ? (
              <Image src={album.coverImage} alt={album.title} width={600} height={600} className="w-full h-full object-cover" priority />
            ) : (
              <Music size={48} strokeWidth={0.75} className="text-white/15" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
              <p className={LABEL_CLS}>Прослушивания</p>
              <p className="text-2xl font-bold text-white/70 tabular-nums">0</p>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
              <p className={LABEL_CLS}>В плейлистах</p>
              <p className="text-2xl font-bold text-white/70 tabular-nums">0</p>
            </div>
          </div>
        </div>

        {/* ── Right: metadata + tracklist ─────────────────────────────────── */}
        <div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mb-8">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.10] text-[12px] font-medium text-white/50 hover:text-white/80 hover:border-white/25 transition-all disabled:opacity-40"
                >
                  <X size={12} strokeWidth={2} />
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !editTitle.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black text-[12px] font-bold hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
                  {isSaving ? "Сохраняем…" : "Принять изменения"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.12] text-[12px] font-medium text-white/50 hover:text-white/80 hover:border-white/25 transition-all"
                >
                  <Pencil size={12} strokeWidth={1.75} />
                  Редактировать
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/[0.20] text-[12px] font-medium text-red-500/70 hover:bg-red-500/[0.08] hover:text-red-400 transition-all"
                >
                  <Trash2 size={12} strokeWidth={1.75} />
                  Удалить релиз
                </button>
              </>
            )}
          </div>

          {/* Release type — always static */}
          <p className="text-[11px] font-black tracking-[0.2em] text-white/40 uppercase mb-3">
            {TYPE_LABELS[album.type] ?? album.type}
          </p>

          {/* Title */}
          {isEditing ? (
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Название релиза"
              maxLength={200}
              autoFocus
              className="text-4xl md:text-5xl font-black bg-transparent border-b-2 border-white/20 focus:border-white w-full py-2 text-white placeholder:text-white/20 transition-colors focus:outline-none mb-2"
            />
          ) : (
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none mb-2">
              {album.title}
            </h2>
          )}

          {/* Featured artists */}
          {isEditing ? (
            <div className="mt-4 mb-6">
              <label className={LABEL_CLS}>Дополнительные артисты (feat.)</label>
              <input
                value={editFeat}
                onChange={e => setEditFeat(e.target.value)}
                placeholder="Например: Travis Scott, Drake"
                maxLength={300}
                className={INPUT_CLS}
              />
            </div>
          ) : (
            album.featuredArtists && (
              <p className="text-[15px] text-white/40 mb-8">feat. {album.featuredArtists}</p>
            )
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 mt-6">

            {/* Release date — always read-only per platform policy */}
            {album.releaseDate && (
              <div>
                <p className={LABEL_CLS}>Дата выхода</p>
                <p className="text-[14px] text-white/70">{formatDate(album.releaseDate)}</p>
              </div>
            )}

            <div>
              <label className={LABEL_CLS}>Жанр</label>
              {isEditing ? (
                <input value={editGenre} onChange={e => setEditGenre(e.target.value)} placeholder="—" className={INPUT_CLS} />
              ) : (
                <p className="text-[14px] text-white/70">{album.genre || "—"}</p>
              )}
            </div>

            <div>
              <label className={LABEL_CLS}>Язык</label>
              {isEditing ? (
                <input value={editLanguage} onChange={e => setEditLanguage(e.target.value)} placeholder="—" className={INPUT_CLS} />
              ) : (
                <p className="text-[14px] text-white/70">{album.language || "—"}</p>
              )}
            </div>

            <div>
              <label className={LABEL_CLS}>Лейбл</label>
              {isEditing ? (
                <input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="—" className={INPUT_CLS} />
              ) : (
                <p className="text-[14px] text-white/70">{album.label || "—"}</p>
              )}
            </div>

          </div>

          <hr className="border-white/[0.07] my-10" />

          {/* Tracklist */}
          <div>
            <div className="flex items-baseline justify-between mb-5">
              <h3 className="text-[13px] font-black tracking-[0.15em] text-white/50 uppercase">Треклист</h3>
              <span className="text-[11px] text-white/25">
                {isEditing ? editTracks.length : album.tracks.length}{" "}
                {(isEditing ? editTracks.length : album.tracks.length) === 1
                  ? "трек"
                  : (isEditing ? editTracks.length : album.tracks.length) < 5
                  ? "трека"
                  : "треков"}
                {(isEditing ? totalEditDuration : album.totalDuration) > 0 &&
                  ` · ${formatDuration(isEditing ? totalEditDuration : album.totalDuration)}`}
              </span>
            </div>

            {/* Read mode: static list */}
            {!isEditing && (
              album.tracks.length === 0 ? (
                <p className="text-[13px] text-white/20 py-6 text-center border border-white/[0.04] rounded-xl">
                  Треки не найдены
                </p>
              ) : (
                <div className="flex flex-col">
                  {album.tracks.map((track, i) => (
                    <div
                      key={track.id}
                      className={[
                        "flex items-center gap-4 py-3.5 group transition-colors",
                        i < album.tracks.length - 1 ? "border-b border-white/[0.04]" : "",
                      ].join(" ")}
                    >
                      <span className="w-5 text-center text-[12px] font-bold text-white/20 shrink-0 tabular-nums select-none">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white/75 truncate leading-snug group-hover:text-white transition-colors">
                          {track.title}
                        </p>
                        {track.featuredArtists && (
                          <p className="text-[11px] text-white/25 truncate mt-0.5">feat. {track.featuredArtists}</p>
                        )}
                      </div>
                      <span className="text-[12px] text-white/25 tabular-nums shrink-0 select-none">
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Edit mode: sortable accordion */}
            {isEditing && (
              editTracks.length === 0 ? (
                <p className="text-[13px] text-white/20 py-6 text-center border border-white/[0.04] rounded-xl">
                  Все треки удалены
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleTrackDragStart}
                  onDragEnd={handleTrackDragEnd}
                >
                  <SortableContext
                    items={editTracks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-1">
                      {editTracks.map((track, i) => (
                        <SortableEditTrackRow
                          key={track.id}
                          track={track}
                          index={i}
                          isSingle={isSingle}
                          expanded={expandedEditTrackId === track.id}
                          onToggle={toggleEditTrack}
                          onRemove={removeEditTrack}
                          onTitle={updateEditTitle}
                          onFeat={updateEditFeat}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )
            )}
          </div>

        </div>
      </div>
    </>
  );
}
