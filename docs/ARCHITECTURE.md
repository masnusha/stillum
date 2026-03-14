# Stillum – System Architecture (MVP)

## Overview
This document defines the core database and system structure for Stillum.
Stillum is:
- Private-first personal audio cloud.
- Curated playlist-based.
- Non-social.
- No public feed.
- No algorithmic ranking.
- No engagement metrics (likes/comments).
All access and file uploads must be server-validated (Zero Trust).

## Core Entities Overview
1. User
2. Track
3. Playlist
4. PlaylistTrack
5. Report (DMCA / Moderation)
6. Account (Auth.js standard)
7. Session (Auth.js standard)

---

## 1. User
Represents a person using the system.
**Fields:**
- `id` (String, uuid, PK)
- `email` (String, unique)
- `username` (String, unique, nullable for new users)
- `passwordHash` (String, nullable for OAuth users)
- `avatarUrl` (String, nullable)
- `bio` (String, nullable, max 120 chars)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relationships:**
- Owns many `Track`s
- Owns many `Playlist`s
- Has many `Account`s and `Session`s (Auth.js)

---

## 2. Track (The Audio Cloud)
Represents a single audio file uploaded by a user.
**Fields:**
- `id` (String, uuid, PK)
- `ownerId` (String, relation to User)
- `title` (String, strictly formatted)
- `artist` (String, strictly formatted)
- `audioUrl` (String, S3 object URL)
- `coverUrl` (String, nullable, S3 object URL)
- `duration` (Int, seconds)
- `isPublic` (Boolean, default: false) - *Crucial for DMCA soft-takedowns*
- `createdAt` (DateTime)

**Rules:**
- Belongs to exactly ONE User (the uploader).
- Physical files must be saved with UUIDs, never original filenames.
- If `isPublic` is false, only the `ownerId` can fetch or play this track.

---

## 3. Playlist (The Curated Rooms)
Represents a collection of tracks.
**Fields:**
- `id` (String, uuid, PK)
- `ownerId` (String, relation to User)
- `name` (String)
- `coverUrl` (String, nullable, auto-generated from tracks or custom)
- `isPublic` (Boolean, default: false)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Rules:**
- Cannot exist without an Owner.
- If `isPublic` is true, anyone with the link can view/play it.
- If `isPublic` is false, only the owner can view it.

---

## 4. PlaylistTrack (The Join Table)
Connects Tracks to Playlists with a specific order.
**Fields:**
- `id` (String, uuid, PK)
- `playlistId` (String, relation to Playlist)
- `trackId` (String, relation to Track)
- `position` (Int, for drag-and-drop reordering)
- `addedAt` (DateTime)

**Constraints:**
- A track can be in multiple playlists.
- When querying a playlist, tracks must be `ORDER BY position ASC`.

---

## 5. Report (DMCA / Informational Intermediary)
Represents a copyright or moderation report against a public track/playlist.
**Fields:**
- `id` (String, uuid, PK)
- `targetType` (Enum: TRACK | PLAYLIST | USER)
- `targetId` (String)
- `reason` (String)
- `status` (Enum: PENDING | RESOLVED | REJECTED)
- `createdAt` (DateTime)

**Rules:**
- Handled by Admins only.
- If a Track is found infringing, Admin switches Track.`isPublic` to `false` (Soft Takedown). The file is NOT deleted, preserving the user's private cloud integrity.

---

## 6. Relationships Summary

User
├── owns → Track (Audio files)
├── owns → Playlist (Collections)
├── has → Account (Google/OAuth)
├── has → Session (Auth.js)

Playlist
├── contains → PlaylistTrack (Ordering logic)
│   └── points to → Track

---

## Access Control Logic (Zero Trust)
To play a track or view a playlist:
1. **Validate Session:** Who is making the request?
2. **Check Ownership:** If `User.id == Track.ownerId`, allow access.
3. **Check Public Flag:** If `Track.isPublic == true`, allow access.
4. **Deny:** If neither is true, return 404/403. 
*Never trust client-side IDs without server validation.*

## Deletion Strategy
- **Remove Track from Playlist:** Only deletes the `PlaylistTrack` row.
- **Delete Playlist:** Deletes the Playlist and its `PlaylistTrack` rows. Leaves physical `Track`s intact.
- **Delete Track:** Deletes the physical file from S3 S3, deletes the `Track` row, and cascades to delete associated `PlaylistTrack` rows.

## File Hook Points (Upload Flow)
1. **Client:** User drops `.mp3`. Client parses ID3 tags (Artist, Title, Cover) in memory.
2. **Server Action:** Validates MIME type (`audio/mpeg`, `audio/wav`), checks 15MB file size limit.
3. **Storage:** Uploads file to S3-compatible storage, renaming file to `UUID.mp3`.
4. **Database:** Creates `Track` record with the returned S3 URL.

## Storage Strategy
- **Audio & Images:** Use S3-compatible object storage.
- **NEVER** store large BLOBs in the PostgreSQL database.
- **Filenames:** Always overwrite user filenames with generated UUIDs to prevent directory traversal and encoding bugs.

## Indexing Requirements
Add DB indexes for fast queries:
- `User.email`
- `User.username`
- `Track.ownerId`
- `Playlist.ownerId`
- `PlaylistTrack.playlistId`
- `PlaylistTrack.trackId`

## Architecture Philosophy
Stillum is not:
- A social network.
- A viral loop engine.
Stillum is:
- A controlled private environment.
- An aesthetic audio cloud.
Architecture must reflect this. Queries must be scoped to the user.
