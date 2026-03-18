import { create } from "zustand";

interface PlaylistModalState {
  isOpen:    boolean;
  trackId:   string | null;
  openModal:  (trackId: string) => void;
  closeModal: () => void;
}

export const usePlaylistModal = create<PlaylistModalState>((set) => ({
  isOpen:    false,
  trackId:   null,
  openModal:  (trackId) => set({ isOpen: true, trackId }),
  closeModal: ()        => set({ isOpen: false, trackId: null }),
}));
