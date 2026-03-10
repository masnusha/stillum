# Stillum – Database Architecture & Access Rules

## Overview
This document defines the PostgreSQL database schema and Supabase Row Level Security (RLS) policies for Stillum. 
Claude MUST use this as the absolute source of truth when generating database migrations, types, and querying logic.
The backend follows a zero-trust model: The client is never trusted. All access control is enforced at the database level via Supabase RLS.

## 1. Database Schema

### Table: `profiles`
Extends the default Supabase `auth.users` table.
- `id` (uuid, primary key, references auth.users)
- `username` (text, unique, nullable)
- `avatar_url` (text, nullable)
- `created_at` (timestamp)

### Table: `tracks`
Stores metadata for uploaded audio files.
- `id` (uuid, primary key, default gen_random_uuid())
- `user_id` (uuid, references profiles.id, not null)
- `artist` (text, not null) - Extracted from ID3 or manually entered.
- `title` (text, not null) - Extracted from ID3 or manually entered.
- `audio_path` (text, not null) - Path in the Supabase Storage bucket.
- `cover_path` (text, nullable) - Path to the extracted cover art.
- `duration` (integer, nullable) - Duration in seconds.
- `is_public` (boolean, default false) - The core of the legal intermediary model.
- `created_at` (timestamp)

### Table: `playlists`
User-curated collections of tracks.
- `id` (uuid, primary key, default gen_random_uuid())
- `user_id` (uuid, references profiles.id, not null)
- `title` (text, not null)
- `cover_path` (text, nullable)
- `is_public` (boolean, default false)
- `created_at` (timestamp)

### Table: `playlist_tracks`
Junction table mapping tracks to playlists.
- `playlist_id` (uuid, references playlists.id, on delete cascade)
- `track_id` (uuid, references tracks.id, on delete cascade)
- `added_at` (timestamp)
- Primary Key: (playlist_id, track_id)

## 2. Row Level Security (RLS) Policies

Claude MUST implement the following RLS policies in Supabase SQL migrations. **No table should have RLS disabled.**

### `profiles` Policies
- **SELECT:** Public (Anyone can view profiles to see usernames/avatars).
- **INSERT:** Triggered automatically by Supabase Auth (Trigger on auth.users).
- **UPDATE:** Only the user can update their own profile (`auth.uid() = id`).
- **DELETE:** Restricted (Users cannot delete their own profile directly via client logic; handled by Edge Functions if needed).

### `tracks` Policies
- **SELECT:** - Owner can read: `auth.uid() = user_id`
  - Public can read: `is_public = true`
- **INSERT:** Authenticated users only. `user_id` must match `auth.uid()`.
- **UPDATE:** - Only the owner can update (`auth.uid() = user_id`).
  - *Exception:* Admins/System can force `is_public = false` for DMCA takedowns.
- **DELETE:** Only the owner can delete (`auth.uid() = user_id`).

### `playlists` Policies
- **SELECT:** - Owner can read: `auth.uid() = user_id`
  - Public can read: `is_public = true`
- **INSERT/UPDATE/DELETE:** Only the owner (`auth.uid() = user_id`).

### `playlist_tracks` Policies
- **SELECT:** - Users can read if they own the playlist: `EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND user_id = auth.uid())`
  - OR if the playlist is public: `EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND is_public = true)`
- **INSERT/DELETE:** - Only the owner of the playlist can add/remove tracks: `EXISTS (SELECT 1 FROM playlists WHERE id = playlist_id AND user_id = auth.uid())`

## 3. Storage Buckets & Policies

Supabase Storage will have two buckets: `audio` and `images`.

### `audio` Bucket
- **Upload (INSERT):** Authenticated users only. File path must be structured as `user_id/uuid.mp3`.
- **Read (SELECT):** - Users can read their own files.
  - Public can read files linked to tracks where `is_public = true`.
- **Delete/Update:** Only the owner (`auth.uid() = user_id` in path).
- **Constraints:** MIME types limited to `audio/mpeg`, `audio/wav`, `audio/mp3`. Max size 15MB.

### `images` Bucket
- Used for avatars and track/playlist covers.
- **Upload:** Authenticated users only.
- **Read:** Publicly accessible.
- **Constraints:** MIME types `image/jpeg`, `image/png`, `image/webp`. Max size 2MB.

## 4. Engineering Directives for Claude
- Always generate TypeScript types based on this schema (using Supabase CLI or manual interfaces).
- Never fetch `SELECT *`. Always specify the exact columns needed for the UI to reduce payload size.
- When querying tracks for a public playlist, ensure the UI gracefully handles cases where a track's `is_public` status was changed to false by the owner or DMCA after it was added to the playlist.
