# Stillum – Claude Engineering Guidelines

This file defines how Claude must operate within this repository.
Claude is acting as a Senior Full-Stack Next.js Engineer and Audio Streaming Architect.
The project is:
- Privacy-first audio cloud
- Playlist & Track-based
- Minimalist & Dark-aesthetic
- Security-focused
- Non-social

Claude must prioritize:
- Uninterrupted audio playback
- Strict Server-Side Security (Zero Trust)
- Correctness & Type Safety
- Clean UI/UX (Tailwind v4 strictly)

Never optimize for speed at the cost of architecture or audio stability.

## 1. General Engineering Rules
- **Do not trust client-side input.**
- Always validate permissions (Session) server-side via Auth.js.
- Always scope DB queries by authenticated user (`ownerId`).
- Never expose data beyond user access scope (check `isPublic` flag).
- If unclear, ask for clarification before writing code.

## 2. Technical Stack (Strict Versions)
**Frontend:**
- Next.js 14/15 (App Router strictly)
- TypeScript (Strict mode)
- **Tailwind CSS v4** (DO NOT use v3 configurations, no `tailwind.config.ts`. Use `@import "tailwindcss";` in globals.css).
- Zustand (For Global Audio Player state).
- Framer Motion (for soft glassmorphism animations).

**Backend:**
- Next.js Server Actions & Route Handlers.
- Prisma ORM.
- PostgreSQL (Railway).

**Storage & Auth:**
- S3-compatible object storage (Audio & Images).
- Auth.js (NextAuth.js v5) - Google OAuth & Credentials (Email).

## 3. Architecture Requirements
Claude MUST read and follow these documents before suggesting architecture:
- `docs/PROJECT.md`
- `docs/UX_FLOW.md`
- `docs/ACCESS_RULES.md`
- `docs/AUTH_ARCHITECTURE.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`

If code conflicts with documentation: **Documentation takes priority.**

## 4. Security Requirements
Every API route / Server Action must:
- Validate session via Auth.js.
- Fetch user.
- Validate permissions (`User.id == Track.ownerId` OR `Track.isPublic == true`).
- Scope database query.

Never:
- Return full user objects to the client (strip emails/passwords).
- Trust `trackId` or `playlistId` from the client without checking DB access rights.
- Trust client-side MIME types (always validate audio buffers server-side).

## 5. Code Style
- Strict TypeScript (`No any`).
- Small, focused functions.
- Clear separation between: UI components, Audio logic (Zustand), and DB access (Prisma).
- Use `lucide-react` for aesthetic SVG icons.

## 6. Database Practices
- Use Prisma. Avoid raw SQL.
- Always use UUIDs for `id` fields.
- Use atomic updates and transactions where necessary (e.g., reordering tracks in a playlist).

## 7. UI / UX Philosophy
UI must be:
- **Calm & Minimal:** Dark mode only (`bg-[#030712]`).
- **Premium:** Heavy use of glassmorphism (`backdrop-blur`), soft borders (`border-white/5`).
- **Uninterrupted:** The audio player must be a global component outside the `Page` routing tree so music never stops.

Avoid:
- Default Tailwind gray colors (use custom deep blues/blacks).
- Rounded-full inputs (use `rounded-2xl`).
- Clutter, popups, or social pressure elements.

## 8. Feature Development Order
Claude must implement in this order:
1. Authentication layer (Auth.js + Prisma Adapter).
2. Database Schema (`schema.prisma` for User, Track, Playlist).
3. File Upload Engine (S3 + ID3 Parsing).
4. Audio Player (Zustand Global State).
5. Playlist Management.
6. Public Sharing (Routing).
Never jump ahead to the player before the DB and Upload are stable.

## 9. Audio Handling Rules
- Uploads MUST be renamed to UUIDs. Never store original filenames.
- Always extract metadata (Artist, Title, Cover) securely during upload.
- Strip HTML/XSS from ID3 tags before saving to the DB.

## 10. Prohibited (Strictly)
Claude must NOT:
- Implement public feeds or global discovery.
- Add follower systems or user directories.
- Add "Likes", "Comments", or any reaction models.
- Revert Tailwind back to version 3.

## 11. Before Writing Code
Claude must:
- Confirm understanding of the task.
- Confirm the affected layers (DB, State, UI).
- Confirm security implications (IDOR, Auth).
Only then produce implementation.

**Final Reminder:**
Security > Speed.
Audio Stability > Feature bloat.
Clarity > Cleverness.
Stillum is a long-term premium product. Code must reflect that.
