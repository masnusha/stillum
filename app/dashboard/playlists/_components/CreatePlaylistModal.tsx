"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import CreatePlaylistForm from "@/components/CreatePlaylistForm";

interface Props {
  onClose: () => void;
}

export default function CreatePlaylistModal({ onClose }: Props) {
  return (
    // Backdrop
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
        className="w-full max-w-md bg-[#0a0a0c] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-hide"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[15px] font-semibold text-white">Новый плейлист</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <CreatePlaylistForm onClose={onClose} />
      </motion.div>
    </motion.div>
  );
}
