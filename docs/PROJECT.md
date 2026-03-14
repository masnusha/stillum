# Stillum – Core Project Documentation

## Overview
Stillum is a premium, privacy-first personal music cloud and aesthetic audio platform.
It is NOT a noisy social network.
It is NOT a public audio dump.
It is NOT an algorithm-driven feed.
Stillum is a curated digital space where users upload their personal music libraries, organize them into pristine collections, and share them with intentional visual elegance. 
The product is privacy-first and aesthetics-driven.

## Core Philosophy
Stillum exists as a response to the fragmentation of music availability (censorship, track takedowns on majors) and the visual clutter of existing UGC platforms.
Principles:
- Private by default (your cloud, your rules).
- Absolute dictatorship of design and metadata structure (Artist — Title).
- Uninterrupted audio immersion.
- No algorithmic ranking.
- No public discover page (MVP stage).
- No visible engagement competition.

The platform should feel like:
- A quiet digital home for your music.
- A high-end digital record crate.
- An exclusive music club.
- Calm, minimal, aesthetic, and intentional.

## Product Positioning
Stillum is closer to:
- A private digital audio gallery.
- A curated musical mood archive.
- A personal aesthetic music cloud (like [untitled]).

It is NOT:
- Spotify (we do not rely on major label licensing).
- SoundCloud (no messy repost chains or waveform comment sections).
- Google Drive (we are a tailored audio experience, not raw file hosting).

## Target User Experience
The user should feel:
- A sense of premium ownership over their music library.
- Safe from sudden track takedowns in their private space.
- Aesthetic pleasure from the interface.
- Confident sharing their playlists because the UI looks like digital art.

The interface must reflect:
- Minimalism.
- Dark-first aesthetic exclusively.
- Clean spacing and typography.
- Soft glassmorphism animations.
- Emotional depth through album art focus.

## Core Features (MVP)

**1. User Account & Authentication**
- Email-based authentication (Magic Links / Password).
- OAuth Providers: Google (via Auth.js).
- Minimal profile: Avatar, Username, Short bio.

**2. Personal Audio Cloud (The Foundation)**
- Users can upload `.mp3` or `.wav` files.
- Automated ID3 tag parsing (Cover, Artist, Title).
- Content is private by default.
- Displayed in a responsive, clean list/grid layout.

**3. Global Audio Player (SPA)**
- Continuous playback is mandatory across navigations.
- Audio engine managed via Zustand.
- Minimal UI: Play, Pause, Next, Prev, Progress, Volume.

**4. Playlists (The Curated Rooms)**
- Users organize their uploaded tracks into Playlists.
- Playlists are private by default but can be made public to share.
- Public playlists generate highly aesthetic, shareable UI cards.

## Sharing Model
- Tracks and Playlists are strictly account-based.
- Playlists can be shared via direct link.
- Access to a public playlist can be revoked at any time by making it private.
- No global public search for user libraries.

## Access Roles & Legal (Informational Intermediary)
- **Owner:** Controls the track/playlist. Can delete, make public/private.
- **Takedown Policy (Soft Takedown):** If a copyright holder reports a public track, the track's `is_public` flag is set to `false`. It disappears from the public internet but remains safely in the original uploader's private library.

## Reactions
- Listening is a private experience.
- No visible like counters between viewers.
- No public engagement signals.
- This prevents herd behavior and audio comparison.

## What Stillum Will NOT Include (MVP)
- Public follower/following system.
- Global search / Discover page.
- Algorithmic recommendation feeds.
- Comment threads on tracks.
- Public trending content.
- Light mode.

## Design Direction
Visual direction:
- Deep dark backgrounds (`#030712`, pure black).
- High-contrast white typography (Inter / SF Pro).
- Soft, glowing accents (referencing the Stillum logo light beam).
- Heavy use of `backdrop-blur` (glassmorphism) for player controls.
The design should feel: Expensive, hypnotic, modern, and clean.

## Long-Term Vision
Stillum can evolve into:
- A cultural aesthetic audio platform.
- A digital identity layer through musical taste.
- A privacy-focused creative archive for independent artists.
But MVP focuses only on: Private audio cloud + aesthetic player + controlled sharing.

## Security Mindset
Security is fundamental to our legal survival:
- Server-side validation only (Zero Trust).
- Strict MIME-type checking for audio uploads.
- Secure file renaming (UUIDs) upon upload.
- Route Handlers protection via Auth.js sessions.

## Technical Stack (Planned)
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS v4, Framer Motion.
- **State:** Zustand (Audio Player).
- **Backend/DB:** PostgreSQL (hosted on Railway) + Prisma ORM.
- **Auth:** Auth.js (NextAuth.js v5).
- **Storage:** S3-Compatible Object Storage (e.g., AWS S3, Cloudflare R2).

## Development Principle
The architecture must prioritize:
1. **Audio Stability:** The music must never stop.
2. **Clarity & Predictability:** No overengineering.
3. **Type Safety:** Strict end-to-end typing with Prisma.
4. **Maintainability:** Clean separation of UI and audio logic.

## User Profiles
Users have minimal profiles.
Profile includes:
- Avatar
- Username
- Short bio (optional, max 120 characters)
Profiles are NOT public by default. They exist merely to anchor public playlists.
No follower system. No engagement counters.
