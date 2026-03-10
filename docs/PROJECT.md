# Stillum – Core Project Documentation

## Overview
Stillum is a premium, UGC-driven audio platform and personal music cloud.
It is NOT a messy public audio dump.
It is NOT a pirate website.
It is NOT a visually cluttered social network.
Stillum is a curated, aesthetic digital space where users can upload their personal music libraries, organize them into pristine collections, and share them with uncompromising visual elegance.

## Core Philosophy
Stillum exists as a response to the fragmentation of music availability and the visual clutter of existing UGC platforms (like SoundCloud).
Principles:
- Complete freedom of upload for the user.
- Absolute dictatorship of design and metadata structure from the platform.
- Uninterrupted audio immersion.
- Virality through aesthetic curation, not algorithmic forcing.
- The platform should feel like: A high-end digital record crate, an exclusive music club, an art gallery for audio.

## Product Positioning
Stillum is a synthesis of:
- The upload freedom and community of **SoundCloud**.
- The elite minimalism and cloud-folder logic of **[untitled]**.
- The pristine, consumer-friendly UI of **Apple Music**.

It is NOT:
- Spotify (we do not rely on major label licensing for our core library).
- A raw file hosting service (like Google Drive).
- A social feed with comments and repost chains.

## Target User Experience
The user should feel:
- A sense of premium ownership over their music library.
- Aesthetic pleasure from the interface.
- Confident sharing their playlists to Instagram/Telegram because the UI looks like digital art.
The interface must reflect:
- Dark mode exclusively.
- Deep, immersive backgrounds with glassmorphism overlays.
- Minimal text, maximum focus on album art and typography.

## Core Features (MVP)

**1. User Account & Authentication**
- Primary: Standard Email and Password (or Magic Links).
- OAuth Providers: Google and VK (ВКонтакте) via Auth.js (NextAuth).
- Apple Sign-in: Placeholder only (UI-only for MVP).
- No forced social links to preserve privacy.

**2. Personal Audio Cloud (The Foundation)**
- Users can upload `.mp3` or `.wav` files.
- The system automatically parses ID3 tags (Cover, Artist, Title) or allows manual input.
- **CRITICAL RULE:** Tracks are strictly formatted in the UI as `Artist — Title`. Usernames of uploaders are relegated to small, secondary metadata (e.g., "uploaded by @user"). NO messy filenames in the player.

**3. Global Audio Player (SPA)**
- Continuous playback is mandatory.
- The audio engine (managed via Zustand) persists across all page navigations.
- Features: Play, Pause, Next, Previous, Progress Bar, Volume.

**4. Playlists (The Viral Engine)**
- Users organize their uploaded tracks into Playlists.
- Playlists can be Private or Public.
- Public playlists generate highly aesthetic, shareable UI cards designed specifically for social media export.

## Legal & Security Model (Informational Intermediary)
Stillum operates under the strict legal framework of an informational intermediary:
- **Private by Default:** Uploaded tracks are private cloud storage for the user.
- **Takedown Policy (DMCA):** If a copyright holder reports a public track, the track's `is_public` flag is set to `false`. It disappears from public search and public playlists, but remains in the original uploader's private library.
- We do not touch, modify, or distribute the audio files ourselves; we provide the software layer.

## What Stillum Will NOT Include (MVP)
- Algorithmic recommendation feeds.
- Comment sections on tracks.
- Like counters visible to the public.
- Light mode / White themes.
- Direct downloading of other users' audio files (playback only).

## Design Direction
Visual direction:
- Deep dark backgrounds (`#050A15`, pure black, deep slate).
- High-contrast white typography (Inter / SF Pro).
- Soft, glowing accents (referencing the Stillum logo light beam).
- Heavy use of `backdrop-blur` for player controls and sticky headers.
The design should feel: Expensive, hypnotic, modern, and clean.

## Technical Stack
- **Frontend:** Next.js (App Router), TypeScript.
- **Styling:** Tailwind CSS, Framer Motion.
- **State Management:** Zustand (Crucial for the global audio player).
- **Authentication:** Auth.js (NextAuth.js).
- **Backend/DB:** PostgreSQL (hosted on Railway) with Prisma ORM.
- **Storage:** S3-Compatible Object Storage.
- **Deployment target:** Railway.

## Development Principle
The architecture must prioritize:
1. **Audio Stability:** The music must never stop when clicking a link.
2. **UI Polish:** Spacing, alignment, and blur effects must be pixel-perfect.
3. **Type Safety:** Strict TypeScript models via Prisma Client.
4. **Security:** Strict server-side validation and session checking via Auth.js, ensuring users only mutate their own data.
No premature optimization. Build the core player and the upload flow first.
