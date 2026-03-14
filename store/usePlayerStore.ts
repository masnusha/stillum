import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RepeatMode = "off" | "all" | "one";

export interface PlayerTrack {
  id:          string;
  title:       string;
  artist:      string;
  audioUrl:    string;
  coverUrl:    string | null;
  duration:    number;
  isExplicit?: boolean;
  ownerId?:    string;
  // Optional metadata — populated when playing from own library
  genre?:       string | null;
  releaseDate?: string | null;
  recordLabel?: string | null;
  buyLink?:     string | null;
}

interface PlayerState {
  currentTrack:  PlayerTrack | null;
  /** Active playback order — may be shuffled. */
  queue:         PlayerTrack[];
  /** Original unshuffled order — used to restore when shuffle is turned off. */
  originalQueue: PlayerTrack[];
  isShuffle:     boolean;
  isPlaying:     boolean;
  volume:        number;
  repeatMode:    RepeatMode;

  // Actions
  /** Syncs the library list into the store (called from TrackList on mount). */
  setQueue:         (tracks: PlayerTrack[]) => void;
  /** Patches a track in currentTrack / queue / originalQueue without touching audioUrl. */
  updateTrackInStore: (patch: Partial<PlayerTrack> & { id: string }) => void;
  /** Starts playing a track. Pass contextTracks to set the queue from a new context. */
  playTrack:        (track: PlayerTrack, contextTracks?: PlayerTrack[]) => void;
  /** Jump directly to queue[index] and start playing. */
  playFromQueue:    (index: number) => void;
  playNext:         () => void;
  playPrevious:     () => void;
  togglePlay:       () => void;
  setVolume:        (volume: number) => void;
  toggleShuffle:    () => void;
  toggleRepeatMode: () => void;
  stop:             () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue(
  base:    PlayerTrack[],
  current: PlayerTrack | null,
  shuffle: boolean,
): PlayerTrack[] {
  if (!shuffle) return base;
  const rest = fisherYates(base.filter((t) => t.id !== current?.id));
  return current ? [current, ...rest] : rest;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack:  null,
  queue:         [],
  originalQueue: [],
  isShuffle:     false,
  isPlaying:     false,
  volume:        1,
  repeatMode:    "off",

  // ── setQueue — called by TrackList when library changes ───────────────────
  setQueue: (tracks) =>
    set((s) => ({
      originalQueue: tracks,
      queue:         buildQueue(tracks, s.currentTrack, s.isShuffle),
    })),

  // ── playTrack ──────────────────────────────────────────────────────────────
  playTrack: (track, contextTracks) =>
    set((s) => {
      const base = contextTracks ?? s.originalQueue;
      return {
        originalQueue: base,
        queue:         buildQueue(base, track, s.isShuffle),
        currentTrack:  track,
        isPlaying:     true,
      };
    }),

  // ── playFromQueue ──────────────────────────────────────────────────────────
  playFromQueue: (index) =>
    set((s) => {
      const track = s.queue[index];
      if (!track) return {};
      return { currentTrack: track, isPlaying: true };
    }),

  // ── playNext ───────────────────────────────────────────────────────────────
  playNext: () =>
    set((s) => {
      if (!s.currentTrack || s.queue.length === 0) return {};
      const idx    = s.queue.findIndex((t) => t.id === s.currentTrack!.id);
      const isLast = idx === -1 || idx >= s.queue.length - 1;
      if (isLast && s.repeatMode !== "all") return { isPlaying: false };
      const next = s.queue[isLast ? 0 : idx + 1];
      return { currentTrack: next, isPlaying: true };
    }),

  // ── playPrevious ───────────────────────────────────────────────────────────
  playPrevious: () =>
    set((s) => {
      if (!s.currentTrack || s.queue.length === 0) return {};
      const idx     = s.queue.findIndex((t) => t.id === s.currentTrack!.id);
      const isFirst = idx <= 0;
      if (isFirst && s.repeatMode !== "all") return {};
      const prev = s.queue[isFirst ? s.queue.length - 1 : idx - 1];
      return { currentTrack: prev, isPlaying: true };
    }),

  // ── toggleShuffle ──────────────────────────────────────────────────────────
  toggleShuffle: () =>
    set((s) => {
      const isShuffle = !s.isShuffle;
      return {
        isShuffle,
        queue: buildQueue(s.originalQueue, s.currentTrack, isShuffle),
      };
    }),

  // ── toggleRepeatMode ───────────────────────────────────────────────────────
  toggleRepeatMode: () =>
    set((s) => ({
      repeatMode:
        s.repeatMode === "off" ? "all" : s.repeatMode === "all" ? "one" : "off",
    })),

  // ── updateTrackInStore ─────────────────────────────────────────────────────
  updateTrackInStore: (patch) =>
    set((s) => {
      const merge = (t: PlayerTrack) =>
        t.id === patch.id ? { ...t, ...patch } : t;
      return {
        currentTrack:  s.currentTrack?.id === patch.id
          ? { ...s.currentTrack, ...patch }
          : s.currentTrack,
        queue:         s.queue.map(merge),
        originalQueue: s.originalQueue.map(merge),
      };
    }),

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setVolume:  (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
  stop:       () => set({ isPlaying: false }),
}));
