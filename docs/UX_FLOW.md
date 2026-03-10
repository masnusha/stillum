# Stillum – UX/UI Flow & Interaction Architecture

## Overview
This document defines the aesthetic rules, global audio player logic, and core user journeys for Stillum. 
Claude MUST use these guidelines to construct the UI components and Framer Motion animations. The goal is a hypnotic, uninterrupted, and premium user experience.

## 1. The Global Audio Player (CRITICAL)
The most important technical and UX requirement of Stillum is **uninterrupted audio playback**.

### Architecture:
- **Hidden Audio Element:** Use a single, hidden HTML5 `<audio>` element managed at the root layout level (`app/layout.tsx`), tied to a global Zustand store.
- **Custom UI:** NEVER use the native browser `controls` attribute. Build a custom, aesthetic player bar that sits fixed at the bottom of the viewport or floats like a dynamic island.
- **Strict SPA Navigation:** Claude MUST use Next.js `<Link>` components for ALL internal routing. NEVER use standard `<a>` tags or `window.location.href`, as this will trigger a full page reload and kill the audio.

### Player States:
- **Idle:** Hidden or completely minimized if no track is in the queue.
- **Active:** Displays `Artist — Title`, current time, duration, play/pause, next/prev, and a minimal progress bar.
- **Aesthetic:** The player background MUST use glassmorphism (`backdrop-blur-xl`, `bg-white/5`, `border-t border-white/10`) to let underlying page content softly blur through as the user scrolls.

## 2. Design System & Tailwind Recipes
Stillum is dark, premium, and clean. Claude must rely on these specific Tailwind recipes:

### Backgrounds & Surfaces
- **App Background:** Deep dark `#050A15` or `bg-slate-950`. No solid black (`#000000`) unless for deep contrast.
- **Cards/Containers:** `bg-white/5` with `hover:bg-white/10` for interactive elements.
- **Glassmorphism:** `backdrop-blur-md bg-white/5 border border-white/10`. Use this for sticky headers, modals, and the global player.

### Typography (Inter / SF Pro)
- **Primary Text (Titles):** `text-gray-100 font-medium tracking-tight`.
- **Secondary Text (Artists, Meta):** `text-gray-400 text-sm font-normal`.
- **Rule of Display:** Tracks must ALWAYS be rendered cleanly. The layout must handle long text gracefully using `truncate`.

### Accents & Lighting
- **Active/Brand Accents:** Pure white (`text-white`) with a subtle text-shadow or `box-shadow` to mimic the light beam from the Stillum logo (e.g., a 1px vertical glowing line to indicate the currently playing track).

## 3. Core User Journeys

### Flow A: The Upload & Metadata Process
1. **Action:** User clicks "Upload" or drags a `.mp3`/`.wav` file.
2. **Local Parsing:** Use a library like `music-metadata-browser` to instantly parse ID3 tags (Cover Art, Artist, Title) *before* uploading to the server.
3. **Verification UI:** Present the user with a clean form showing the extracted data. 
4. **Enforcement:** The user MUST confirm the track is in the `Artist — Title` format. If ID3 tags are missing, require manual input.
5. **Upload & Feedback:** Show a minimal, elegant progress spinner. Upon success, add smoothly to the top of the user's library without a page reload.

### Flow B: Playback & Queue Management
1. **Action:** User clicks a track card.
2. **State Update:** The `onClick` handler fires an action to the Zustand store: `playTrack(track, contextQueue)`.
3. **Animation:** The global player bar slides up from the bottom (using Framer Motion). The clicked track card gets a subtle glowing active state.

### Flow C: Playlist Creation & "The Shareable Card"
1. **Action:** User selects tracks and creates a playlist.
2. **Aesthetic Generation:** The playlist cover should ideally be an intelligent collage of the first 4 track covers, heavily blurred, or a user-uploaded image.
3. **Share Intent:** When clicking "Share", trigger a modal that displays a perfectly framed, Instagram-ready UI Card of the playlist. 

## 4. Animation & Micro-interactions (Framer Motion)
Animations must be "expensive" — meaning slow, deliberate, and smooth. Avoid bouncy, elastic, or overly fast transitions.
- **Page Transitions:** Use `<AnimatePresence>` for subtle fade-ins (`opacity: 0` to `opacity: 1`, duration `0.3s`, ease `easeOut`) when navigating between profiles and playlists.
- **Hover States:** Buttons and cards should slightly lift (`translate-y-[-2px]`) or glow (`bg-white/10`) with a transition duration of `150ms`.
- **Loading States:** Use pulse animations (skeleton loaders) with `bg-white/5` instead of generic spinning circles where possible.

## 5. Mobile / PWA Considerations
- The UI must be fully responsive. 
- On mobile, the global player bar should adapt into a tap-to-expand component (like Apple Music's mobile player).
- Ensure tap targets (buttons) are at least `44x44px` for touch accuracy.
