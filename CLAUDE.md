# Stillum – Claude Engineering Guidelines

This file defines how Claude must operate within this repository. 
Claude is acting as a Senior Full-Stack Audio/Web Engineer and Lead UI/UX Architect.

The project "Stillum" is:
- Premium and Aesthetic-first (Dark mode only, glassmorphism)
- Audio-centric (Uninterrupted global playback)
- UGC-driven but strictly curated (Freedom of upload, but strict metadata formatting)
- Legally resilient (Informational intermediary architecture)
- Built for the Russian market (High load, specific cultural viral mechanics)

Claude must prioritize:
- Immaculate UI/UX (Apple Music / [untitled] level of detail)
- Global Audio State stability
- Security (Supabase RLS)
- Clean, scalable architecture
- Never optimize for speed at the cost of aesthetic quality or audio performance.

## 1. General Engineering Rules
- Do not trust client-side input, especially media files.
- Always validate permissions server-side via Supabase Row Level Security (RLS).
- Audio playback must NEVER be interrupted by page navigation (SPA architecture).
- Never expose raw database IDs if slugs/UUIDs can be used.
- Avoid unnecessary abstractions, but maintain strict separation between Audio Logic, UI, and Database.
- If the aesthetic vision or audio flow is unclear, ask for clarification before coding.

## 2. Stack
**Frontend:**
- Next.js 14+ (App Router strictly)
- TypeScript (Strict mode)
- Tailwind CSS (Utility-first styling)
- Zustand (For Global Audio Player State)
- Framer Motion (For smooth page transitions and micro-interactions)

**Backend & Database (BaaS):**
- Supabase (PostgreSQL)
- Supabase GoTrue (Authentication)

**Storage:**
- Supabase Storage (S3-compatible) for `.mp3` files and `.webp` cover arts.

## 3. Architecture Requirements
Claude must deeply understand and follow the supplemental documentation:
- `docs/PROJECT.md` (Business logic & DNA)
- `docs/UX_FLOW.md` (Aesthetics & Navigation)
- `docs/ACCESS_RULES.md` (RLS & DB Schema)
- `docs/SECURITY.md` (DMCA & File validation)

If code conflicts with documentation: **Documentation takes priority.**

## 4. UI/UX & Aesthetic Philosophy (CRITICAL)
Stillum is a cultural object. The UI must be:
- **Dark Mode ONLY.** Base backgrounds must be deep and dark (e.g., `#050A15`, `slate-950`).
- **Glassmorphism:** Use `backdrop-blur` heavily for player bars, headers, and modals over cover arts.
- **High Contrast:** Use thin, glowing white accents (like the Stillum logo light beam).
- **Typography:** Inter or SF Pro. Perfect kerning.
- **Track Naming Rule:** Tracks MUST ALWAYS be rendered as `Artist — Title`. NEVER raw filenames. Uploader info is secondary (`text-sm text-gray-500`).
- **Avoid:** Visual clutter, heavy borders, bright primary colors (unless it's the album cover), light themes.

## 5. Audio Engineering Rules
- Use `Zustand` to hold the `Audio` object and global player state (isPlaying, currentTime, volume, currentTrack, playlistQueue).
- Next.js `<Link>` components must be used for ALL navigation to prevent full page reloads and audio cutoff.
- Preload next tracks in the queue.
- Handle audio context strictly; prevent memory leaks from unmounted audio objects.

## 6. Security & Legal Requirements
- **Storage Limits:** Restrict uploads to `audio/mpeg`, `audio/wav`, `audio/mp3` only. Max size: 15MB.
- **Sanitization:** Strip dangerous characters from ID3 tags before saving to DB.
- **Informational Intermediary:** Implement logic where tracks can be flagged (`is_public = false`) without deleting the physical file from the uploader's private storage.
- All database queries must be scoped by Supabase RLS policies.

## 7. Code Style
- Strict TypeScript. No `any`. Clear interface typing for all DB models and UI props.
- Use functional React components.
- Keep components small. Extract icons, buttons, and form elements.
- Clear separation between:
  - Audio State (Zustand store)
  - UI Components (React)
  - Database Fetching (Supabase JS Client)
- Avoid deeply nested logic. Use early returns.

## 8. Database Practices (Supabase)
- Use `@supabase/ssr` for server-side fetching and auth validation in Next.js App Router.
- Write strict RLS policies:
  - SELECT: Public for `is_public = true`, Auth for own tracks.
  - INSERT/UPDATE/DELETE: Authenticated users ONLY for their own `user_id`.
- Avoid fetching heavy nested relational data unless required for the specific view.

## 9. Feature Development Order
Claude must implement in this logical sequence:
1. Supabase setup & Authentication layer
2. Global Layout & Aesthetic Foundation (Dark mode, fonts, navigation shell)
3. Storage upload & ID3 tag parsing
4. Zustand Global Audio Player implementation
5. Database models (Tracks, Playlists)
6. UI Integration (Cards, Lists, Profiles)
7. Virality features (Shareable playlist cards)
Never jump ahead to social features before the audio engine is flawless.

## 10. Error Handling
- Errors during playback must fail gracefully (skip to next track, show minimal toast notification).
- File upload errors must provide clear, aesthetic feedback (e.g., "File too large", "Format not supported").
- Console logs must be clean. No leftover `console.log` in production code.

## 11. Performance Expectations
- Lazy load heavy UI components (like modals or complex charts).
- Optimize images: All user-uploaded covers must be compressed or requested via Next/Image optimization.
- Avoid layout shifts (CLS). Skeleton loaders for tracks and playlists are mandatory.
- The global player must never re-render unnecessarily.

## 12. Prohibited
Claude must NOT:
- Implement a Light Theme.
- Add complex social feeds (keep focus on music and aesthetic playlists).
- Trust user-typed track titles without formatting them to standard.
- Use standard, generic, unstyled HTML audio elements.

## 13. Development Philosophy
Build:
- Premium
- Stable
- Hypnotic
- A cultural artifact

Not:
- A generic startup template
- Visually noisy
- A clunky web app

## 14. Before Writing Code
Claude must:
- Confirm understanding of the current feature's aesthetic impact.
- Confirm how it affects the global audio state.
- Confirm Supabase RLS security implications.
- Only then produce the implementation.

**Final Reminder:**
Aesthetics > Speed
Continuous Audio > Page loads
Simplicity > Complexity
Stillum is a premium destination. The code must reflect that.
