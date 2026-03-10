# Stillum – Security & Legal Engineering Guidelines

## Overview
This document outlines the strict security, file validation, and legal compliance protocols for Stillum.
Claude MUST treat security as the absolute highest priority. A beautiful UI is worthless if the platform is compromised or legally shut down.
The platform operates under a "Zero Trust" architecture: NEVER trust client-side validation alone.

## 1. File Upload & Storage Security (CRITICAL)
Users will upload media files. This is the #1 attack vector.


### Validation Rules (Server-Side / Edge):
- **File Size Limits:** Audio files (`.mp3`, `.wav`) strictly limited to **15 MB**. Image files (Avatars, Covers) strictly limited to **2 MB**.
- **MIME Type & Extension Checking:** Do not rely merely on the `.mp3` extension. The backend (Supabase Storage policies or Next.js API Routes) MUST verify the actual MIME type (`audio/mpeg`, `audio/wav`).
- **File Renaming:** NEVER save files using the user's original filename. All uploaded files must be renamed to a generated UUID (e.g., `user_id/uuid.mp3`) before saving to the Supabase bucket to prevent directory traversal attacks and encoding issues.

## 2. Input Sanitization & Anti-XSS
Users will input text manually or via ID3 tag extraction. Malicious users might inject scripts into a track's "Artist" or "Title" metadata.

### Sanitization Rules:
- **Strict Escaping:** Rely on React's built-in escaping for text rendering.
- **NO dangerouslySetInnerHTML:** Claude MUST NEVER use `dangerouslySetInnerHTML` in the React codebase under any circumstances.
- **Metadata Stripping:** When parsing ID3 tags on the client or server, strip all HTML tags, script tags, and unusual hidden characters before sending the payload to the database.
- **Length Limits:** Enforce database-level and API-level length limits on text fields to prevent UI breakage and DB bloat (e.g., `title`: max 100 chars, `artist`: max 50 chars).

## 3. Legal Framework: The "Informational Intermediary" Protocol
To comply with copyright laws (e.g., Article 1253.1 of the Civil Code of the Russian Federation / DMCA), Stillum acts as a cloud provider, not a publisher.

### The "Soft Takedown" Mechanism:
Claude must architect the system so that "takedowns" do not break the user's private library.
- **The `is_public` Flag:** Every track has an `is_public` boolean.
- **Takedown Action:** If a copyright claim is received, an admin or automated system will set the track's `is_public` flag to `false`.
- **Result:** The database RLS policies immediately hide this track from global search, public profiles, and public playlists. However, the physical `.mp3` file remains in the uploader's private storage, and they can still listen to it privately.
- **Code implementation:** Ensure all public feed/search queries explicitly include `.eq('is_public', true)`.

## 4. API & Abuse Prevention
- **Rate Limiting:** If implementing custom Next.js Route Handlers for specific actions (like playlist creation or profile updates), implement basic rate limiting to prevent spam.
- **Supabase Quotas:** Design queries to be efficient to avoid exhausting Supabase free/pro tier limits. Avoid N+1 query problems when fetching playlists and their associated tracks.
- **Payload Limits:** Next.js API body size limits must be configured to reject massive JSON payloads that could cause Denial of Service (DoS).

## 5. Development Mindset for Claude
When writing any function that accepts user input or interacts with the database, Claude must internally ask:
1. *"Can a user manipulate this payload to bypass validation?"*
2. *"What happens if the ID3 tag contains `<script>alert(1)</script>`?"*
3. *"Does this query respect the RLS policies defined in `ACCESS_RULES.md`?"*
If the answer exposes a vulnerability, Claude must fix the architecture before outputting the code.
