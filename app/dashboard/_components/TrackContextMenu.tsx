"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreHorizontal,
  ListEnd,
  ListPlus,
  Pencil,
  Download,
  Link2,
  Trash2,
} from "lucide-react";
import { deleteTrack } from "@/app/actions/track";
import { removeTrackFromPlaylist } from "@/app/actions/playlist";
import DeleteConfirmModal from "./DeleteConfirmModal";
import EditTrackModal, { type TrackForEdit } from "./EditTrackModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Track extends TrackForEdit {
  audioUrl: string;
}

interface Props {
  track:         Track;
  /** Always show the trigger button (don't rely on parent group-hover). */
  alwaysVisible?: boolean;
  /** Called after the track is successfully deleted. */
  onDeleted?:     () => void;
  /** If provided, shows "Remove from Playlist" action. */
  playlistId?:    string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Separator() {
  return <div className="h-px bg-white/[0.07] my-0.5 mx-1" aria-hidden />;
}

interface MenuItemProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

function MenuItem({ icon: Icon, label, onClick, destructive }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center gap-2.5 w-full text-left px-3 py-[7px]
        text-[13px] rounded-lg transition-colors duration-100
        ${destructive
          ? "text-red-400/80 hover:bg-red-500/[0.12] hover:text-red-400"
          : "text-white/60 hover:bg-white/[0.07] hover:text-white/90"
        }
      `}
    >
      <Icon size={13} strokeWidth={1.5} className="shrink-0" />
      {label}
    </button>
  );
}

// ─── TrackContextMenu ─────────────────────────────────────────────────────────

export default function TrackContextMenu({ track, alwaysVisible, onDeleted, playlistId }: Props) {
  const [open, setOpen]               = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal,     setShowEditModal]     = useState(false);
  const [menuPos, setMenuPos]         = useState({ top: 0, right: 0 });
  const [isPending, startTransition]  = useTransition();
  const buttonRef                     = useRef<HTMLButtonElement>(null);
  const router                        = useRouter();

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    // Small timeout so this listener doesn't fire on the same click that opened the menu.
    const t = setTimeout(() => {
      const onDown = () => setOpen(false);
      const onKey  = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
      document.addEventListener("mousedown", onDown);
      document.addEventListener("keydown",   onKey);
      return () => {
        document.removeEventListener("mousedown", onDown);
        document.removeEventListener("keydown",   onKey);
      };
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setOpen(v => !v);
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    setOpen(false);

    // Extract extension from S3 URL path.
    let ext = "mp3";
    try {
      const pathname = new URL(track.audioUrl).pathname;
      const segment  = pathname.split(".").pop();
      if (segment && segment.length <= 4) ext = segment;
    } catch { /* keep default */ }

    // Strip chars that are illegal in filenames on Windows / macOS.
    const safe = (s: string) => s.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim();
    const filename = `${safe(track.artist)} - ${safe(track.title)}.${ext}`;

    try {
      // Fetch as blob so the browser downloads it directly instead of navigating.
      const res  = await fetch(track.audioUrl);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: plain anchor (may open new tab on cross-origin).
      const a    = document.createElement("a");
      a.href     = track.audioUrl;
      a.download = filename;
      a.click();
    }
  };

  const handleCopyLink = async () => {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(track.audioUrl);
    } catch {
      window.open(track.audioUrl, "_blank");
    }
  };

  const handleRemoveFromPlaylist = () => {
    if (!playlistId) return;
    setOpen(false);
    startTransition(async () => {
      const result = await removeTrackFromPlaylist(playlistId, track.id);
      if (!result.error) router.refresh();
    });
  };

  const handleDelete = () => {
    setOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    startTransition(async () => {
      const result = await deleteTrack(track.id);
      if (result.error) {
        console.error("[deleteTrack]", result.error);
      }
      setShowDeleteConfirm(false);
      onDeleted?.();
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Edit track modal */}
      {showEditModal && (
        <EditTrackModal
          track={track}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          track={{ title: track.title, artist: track.artist, coverUrl: track.coverUrl }}
          isPending={isPending}
          onConfirm={handleDeleteConfirm}
          onClose={() => { if (!isPending) setShowDeleteConfirm(false); }}
        />
      )}

      {/* Trigger — visible on row hover OR while menu is open / pending */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-label="Track options"
        aria-haspopup="true"
        aria-expanded={open}
        className={`
          w-7 h-7 rounded-lg flex items-center justify-center
          transition-all duration-150 shrink-0
          ${alwaysVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
          ${open || isPending ? "!opacity-100" : ""}
          ${isPending
            ? "text-white/25 cursor-not-allowed"
            : "text-white/35 hover:text-white/80 hover:bg-white/[0.06]"
          }
        `}
      >
        {isPending ? (
          <span className="w-3 h-3 border border-white/30 border-t-transparent rounded-full animate-spin" />
        ) : (
          <MoreHorizontal size={15} strokeWidth={1.5} />
        )}
      </button>

      {/* Dropdown — fixed to viewport, bypasses overflow-y:auto clipping */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.96, y: -4  }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            style={{
              position: "fixed",
              top:   menuPos.top,
              right: menuPos.right,
              transformOrigin: "top right",
            }}
            className="z-[200] w-52 rounded-xl bg-[#1C1C1E]/90 backdrop-blur-2xl border border-white/[0.09] shadow-2xl p-1"
            // Prevent the document mousedown listener from closing the menu when clicking inside.
            onMouseDown={e => e.stopPropagation()}
          >
            <MenuItem icon={ListEnd}  label="Play Next"       onClick={() => { setOpen(false); }} />
            <MenuItem icon={ListPlus} label="Add to Playlist" onClick={() => { setOpen(false); }} />
            <Separator />
            <MenuItem icon={Pencil}   label="Edit Info"       onClick={() => { setOpen(false); setShowEditModal(true); }} />
            <MenuItem icon={Download} label="Download"        onClick={handleDownload} />
            <MenuItem icon={Link2}    label="Copy Link"       onClick={handleCopyLink} />
            <Separator />
            {playlistId && (
              <MenuItem icon={Trash2} label="Удалить из плейлиста" onClick={handleRemoveFromPlaylist} destructive />
            )}
            <MenuItem icon={Trash2}   label="Delete from Library" onClick={handleDelete} destructive />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
