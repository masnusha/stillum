# Stillum – Security Model

This document defines security principles, the threat model, and protection strategies.
Stillum is a privacy-first personal audio cloud.
Security is foundational, not optional.

## 1. Threat Model
Stillum must protect against:
- Unauthorized access to private tracks and playlists.
- Malicious audio/image uploads (e.g., scripts disguised as `.mp3`).
- XSS attacks via manipulated ID3 metadata (Artist, Title).
- Copyright abuse (DMCA) and platform takedowns.
- Session hijacking.
- IDOR (Insecure Direct Object Reference).
- Spam / abuse automation (mass uploading).
- Data leakage between users.
- Enumeration attacks.

## 2. Core Security Principles
- **Never trust client-side data.**
- All file validations and permission checks occur server-side.
- All access is scoped by user identity (Session).
- No public endpoints exposing private library data.
- Minimal attack surface.

## 3. Authentication Security

**OAuth (Google/VK):**
- Email must be verified by the provider.
- Link providers to existing user if email matches.
- Prevent duplicate user creation.

**Session (Auth.js):**
- Stored server-side in PostgreSQL.
- Session ID in `httpOnly` cookie.
- `Secure` flag enabled (HTTPS only).
- `SameSite=Lax` or `Strict`.
- Session invalidated on logout or account deletion.

## 4. Authorization Security
Every request must:
- Validate session.
- Fetch user ID.
- Validate Ownership (`ownerId == user.id`) OR Public Access (`isPublic == true`).

Never:
- Trust client-submitted ownership flags.
- Trust `trackId` or `playlistId` without verifying access rights in the database.
All content queries must be strictly scoped by the user's ID unless explicitly querying public content.

## 5. IDOR Protection
Before accessing any:
- Track
- Playlist
- S3 Audio Stream
System must verify:
- User is the owner OR the entity is explicitly marked `isPublic: true`.
Never allow direct object access by ID alone. Even if a user guesses a Track UUID, the server must reject the request if the track is private.

## 6. Sharing & Public Link Security
Playlists can be shared via the `isPublic` toggle.
- Links use secure, non-sequential UUIDs (no `/playlist/123`).
- Access can be revoked instantly by toggling `isPublic` to `false`.
- The system must prevent search engines from indexing private routes.
- Rate limit validation on public playlist endpoints to prevent scraping.

## 7. Rate Limiting
Apply to:
- Auth routes (OAuth callbacks, logins).
- Audio file uploads (prevent storage exhaustion).
- Playlist creation.
- Report submission.

Protect against:
- Brute force attacks.
- Spam bots filling S3 buckets.
- Resource exhaustion (DoS).

## 8. Content Security (CRITICAL)

**On Audio/Image Upload:**
- **Validate MIME type Server-Side:** Check file signatures, do not trust `.mp3` or `.jpg` extensions.
- **Validate File Size:** Max 15MB for audio, 2MB for images.
- **Rename Files:** ALWAYS rename uploaded files to a generated UUID (e.g., `UUID.mp3`). Never use the user's original filename to prevent directory traversal and encoding exploits.
- **Storage:** Use isolated S3-compatible object storage. Do not allow direct file execution.

## 9. XSS Protection
**ID3 Metadata is a primary vector.**
- Strip all HTML tags and execute strict sanitization on extracted ID3 tags (Title, Artist) before saving to the database.
- Escape all user-generated text on the frontend.
- **NO `dangerouslySetInnerHTML`** allowed in the React codebase.
- Use CSP (Content Security Policy) headers.

## 10. CSRF Protection
- Use `SameSite` cookies.
- Framework-level CSRF protection provided by Next.js server actions and Auth.js.
- Validate origin header on sensitive mutations.

## 11. SQL Injection Protection
- Use ORM (Prisma) for all database interactions.
- Never use raw, unescaped queries.
- Validate all input parameter types strongly via TypeScript.

## 12. Data Isolation
Users must never:
- Access other users' private tracks.
- Access other users' private playlists.
- Access administrative reports.
All queries must filter by `ownerId` context.

## 13. Logging & Monitoring
Log:
- Failed login attempts.
- Rejected file uploads (MIME type mismatch).
- DMCA Report submissions.
- Privilege misuse attempts (403 errors).
Use monitoring tools (e.g., Sentry) to track anomalies.

## 14. Abuse, Moderation & Legal (Informational Intermediary)
System must allow (Admin level):
- **Soft Takedowns:** If a track violates copyright, Admin sets `isPublic = false`. The file remains in the user's private cloud, but vanishes from public links.
- User suspension.
- Suspended users: Cannot login, sessions invalidated, public links return 404.

## 15. Enumeration Protection
Never reveal:
- Whether a specific private track exists (return 404, not 403, to prevent probing).
- Whether an email exists (during password reset flows).
Always respond generically.

## 16. Secure Headers (Production)
Enable via `next.config.js`:
- HTTPS only
- HSTS (Strict-Transport-Security)
- CSP (Content-Security-Policy)
- X-Frame-Options (DENY)
- X-Content-Type-Options (nosniff)
- Referrer-Policy

## 17. Backups
- Automated daily PostgreSQL backups on Railway.
- Object Storage (S3) versioning enabled to prevent accidental data loss.

## 18. Privacy Guarantee
Stillum does not:
- Analyze private listening habits for advertising.
- Publicly expose private libraries.
- Track cross-site behavior.
Security exists to protect this privacy.

## 19. Future Enhancements
- Web Application Firewall (WAF) via Cloudflare.
- DDoS protection.
- Automated audio fingerprinting to prevent re-upload of explicitly banned tracks.

## Philosophy Reminder
Security must feel invisible to users, but strict internally.
Privacy without security is an illusion.
