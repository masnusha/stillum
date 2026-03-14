# Stillum – Access & Moderation Rules (Zero Trust)

This document defines the strict access control list (ACL), moderation, and data deletion rules for Stillum.
Stillum is a privacy-first audio cloud. 
All access must be heavily validated on the server. There are no exceptions.

---

# 1. Track Access Rules (Audio Cloud)

Tracks are the physical audio files uploaded to the server.

**Owner (Uploader) can:**
- Play the track.
- Edit metadata (Title, Artist).
- Add to any owned playlist.
- Toggle `isPublic` status.
- Permanently delete the track.

**Viewer (Anyone else) can:**
- Play the track ONLY IF `isPublic == true` OR if the track is inside a Playlist where `Playlist.isPublic == true`.
- View the metadata.

**Server MUST protect against:**
- IDOR: A user guessing a `track_id` must receive a 404 (Not Found) if `isPublic == false` and they are not the owner.
- Direct S3 bucket access (audio files must be streamed securely or accessed via signed URLs/proxies).

---

# 2. Playlist Access Rules

Playlists are curated collections of tracks.

**Owner can:**
- View, play, rename, and delete the playlist.
- Add or remove tracks.
- Change track order (position).
- Toggle `isPublic` to share via URL.

**Viewer can:**
- View and play the playlist ONLY IF `isPublic == true`.

**Server MUST protect against:**
- Manipulated `playlist_id` in API requests.
- Unauthorized users attempting to push a new track ID into someone else's playlist array.

---

# 3. Reactions & Social Metrics

**EXPLICITLY BANNED.**
- Viewers cannot react to tracks or playlists.
- Owners cannot see play counts or listen metrics.
- Reason: Stillum is a personal aesthetic space, not an engagement-driven social network. No comparison between users is allowed.

---

# 4. Reporting & Moderation (DMCA Soft Takedown)

Users can report:
1. A Public Playlist.
2. A Public Track (e.g., Copyright Infringement / Illegal Content).
3. A User Profile.

**Report must contain:**
- Reporter ID (if authenticated) or anonymous session trace.
- Target type (TRACK / PLAYLIST / USER).
- Target ID.
- Reason (e.g., DMCA, Abusive Metadata).

**Moderation Execution (Admin Only):**
- If a track is infringing, Admin executes a **Soft Takedown**: `Track.isPublic` is forced to `false`.
- The track disappears from all public links, but remains in the original uploader's private library.
- We act as an Informational Intermediary: we do not delete user files unless explicitly illegal (not just copyrighted).

---

# 5. Automated Content Screening (Upload Phase)

Server MUST perform the following checks before saving to S3:
- **MIME Type Validation:** Reject anything that is not `audio/mpeg` or `audio/wav`.
- **File Size Limit:** Reject files > 15MB to prevent storage abuse.
- **ID3 Tag Stripping:** Automatically strip HTML, scripts, and hidden characters from Artist/Title metadata.
- **File Renaming:** Never save the user's original filename. Always generate a UUID.

Stillum does NOT:
- Run recommendation algorithms.
- Scan private tracks for engagement data.

---

# 6. Username Rules

Usernames must:
- Be alphanumeric, lowercase, no spaces (e.g., `a-z`, `0-9`, `_`).
- Respect character limits (min 3, max 20).
- Pass a basic blacklist filter (no reserved words like `admin`, `system`, or severe profanity).

Goal: Prevent impersonation and harmful identifiers, while keeping profiles minimal.

---

# 7. Rate Limiting

Rate limits MUST apply to:
- Magic Link / Login generation.
- Audio file uploads (e.g., max 50 tracks per hour per user).
- Playlist creation.
- Report submission.

---

# 8. Critical Security Rules

Server must ALWAYS verify in every API route / Server Action:
- `session.user.id` exists.
- `target_id` (Track/Playlist) belongs to `session.user.id` OR is explicitly marked `isPublic: true`.

Never trust:
- Client-submitted `ownerId`.
- Client-submitted roles.
- Hidden form fields.

---

# 9. Data Deletion Rules

**Track Deletion (by Owner):**
- Delete the physical `.mp3` file from S3.
- Cascade delete all `PlaylistTrack` connection rows (removes the track from all playlists it was added to).
- Delete the `Track` record from the DB.

**Playlist Deletion (by Owner):**
- Delete all `PlaylistTrack` connection rows.
- Delete the `Playlist` record.
- **Crucial:** DO NOT delete the physical `Track` files. Playlists are just visual folders.

**User Deletion:**
- Cascade delete all Playlists, Tracks, and S3 files owned by the user.
- Terminate all active sessions.

---

# 10. Philosophy Reminder

Stillum is privacy-first.
Moderation and access control exist ONLY to:
- Protect the user's private audio cloud.
- Reduce legal risk for the platform (DMCA compliance).
- Prevent illegal activity and storage abuse.
- Maintain system integrity.

There is no public ranking, no follower system, no engagement competition.
