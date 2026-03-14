"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X } from "lucide-react";

interface Track {
  title: string;
  artist: string;
  coverUrl: string | null;
}

interface Props {
  track: Track;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteConfirmModal({ track, isPending, onConfirm, onClose }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        key="delete-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={e => { if (e.target === e.currentTarget && !isPending) onClose(); }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/60"
      >
        <motion.div
          key="delete-modal"
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1,    y: 0 }}
          exit={{    opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-[360px] bg-[#050A15] border border-white/[0.07] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-4">
            <div className="w-9 h-9 rounded-xl bg-red-500/[0.1] border border-red-500/[0.15] flex items-center justify-center shrink-0">
              <Trash2 size={15} strokeWidth={1.5} className="text-red-400/80" />
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="text-white/20 hover:text-white/60 transition-colors disabled:pointer-events-none"
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div className="px-5 pb-5 space-y-4">
            {/* Title */}
            <div>
              <h2 className="text-[15px] font-semibold text-white tracking-tight">
                Delete from library?
              </h2>
              <p className="text-[13px] text-white/35 mt-1 leading-relaxed">
                The file will be permanently removed from your cloud. This cannot be undone.
              </p>
            </div>

            {/* Track preview */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              {/* Cover */}
              <div className="w-9 h-9 rounded-md bg-white/[0.05] border border-white/[0.05] shrink-0 overflow-hidden flex items-center justify-center">
                {track.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-sm bg-white/[0.08]" />
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white/80 truncate leading-tight">
                  {track.title}
                </p>
                <p className="text-[11px] text-white/30 truncate mt-0.5">
                  {track.artist}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-white/45 hover:text-white/75 text-[13px] font-medium py-2.5 rounded-xl transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className="flex-1 bg-red-500/[0.12] hover:bg-red-500/[0.2] border border-red-500/[0.2] hover:border-red-500/[0.35] text-red-400 text-[13px] font-semibold py-2.5 rounded-xl transition-all duration-150 disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border border-red-400/50 border-t-transparent rounded-full animate-spin shrink-0" />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
