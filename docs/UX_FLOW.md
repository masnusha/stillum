# Stillum – UX Flow (Passwordless & Audio-First)

Stillum is not a social network.
It is a private digital audio space.

Authentication must feel effortless and modern.
No passwords. No friction.
Listening must be uninterrupted.

---

# 1. Landing Page

User sees:
- Minimalist Logo (Light beam)
- Short manifesto: "Your private audio cloud."
- Primary CTA: "Enter Stillum"

Scrolling reveals:
- What Stillum is (Aesthetic music storage).
- Privacy positioning (No takedowns in your private library).
- How sharing works (Curated aesthetic playlists).

No public content preview.
No trending tracks.
No global search.

---

# 2. Authentication (Unified Flow)


There is no separation between Sign Up and Sign In.

User sees:
**Title:** Enter your email
**Input:** Email address
**Primary button:** Continue

**Separator:** or

**Buttons:**
- Continue with Google
- (Continue with VK / Apple – later stage)

---

# 3. Magic Link Flow (Email)

1. User enters email.
2. Server generates:
   - One-time secure token.
   - 10–15 minute expiration.
3. Email sent: "Access your Stillum cloud."
4. User clicks link.
5. Server validates:
   - Token exists.
   - Not expired.
   - Not used.
6. Session created via Auth.js.
7. Token marked as used.

No password creation.
No password reset emails.
No password storage vulnerabilities.

---

# 4. OAuth Flow (Google)

1. User selects Google provider.
2. Redirect to Google secure portal.
3. On success:
   - Receive provider ID & verified email.
4. If email exists: Attach provider to existing user seamlessly.
5. If new user: Create new account.
6. Redirect to Onboarding.

---

# 5. First-Time Onboarding

If user has no username:

**Screen Title:** Define your identity

**Fields:**
- Username (required)
- Avatar (optional)
- Bio (optional)

**Validation:**
- Username uniqueness.
- Lowercase, alphanumeric.

After submit → Redirect to empty Library.

---

# 6. First Upload (Zero-to-Value)

User sees: "Your cloud is empty."

**Action:** Drag & Drop audio files (`.mp3`, `.wav`).
1. Client instantly parses ID3 tags (Artist, Title, Cover).
2. Files upload to S3 securely.
3. Tracks appear in the Library beautifully formatted as `Artist — Title`.

After first upload → Persistent Audio Player appears docked at the bottom.

---

# 7. Main Dashboard (The Library)


**Layout:**

**Left Sidebar:**
- User avatar + username
- My Library (All Tracks)
- Playlists
- + Create Playlist

**Main Area:**
- Track list / Cover grid.
- Strictly formatted text.

**Bottom (Global):**
- SPA Audio Player (Play, Pause, Progress, Volume).
- Never reloads during navigation.

**Minimal.**
No social metrics.
No notifications feed.

---

# 8. My Library (Track Management)

Owner can:
- Play tracks.
- Edit metadata (Title, Artist).
- Add tracks to Playlists.
- Delete tracks (permanently removes from S3 and all playlists).

---

# 9. Playlists (Curated Collections)

Owner can:
- Create new playlist.
- Drag & drop to reorder tracks.
- Toggle visibility: `Private` (default) or `Public`.
- Generate aesthetic Share Card for Instagram/Telegram.

---

# 10. Inside Playlist (Owner View)

Owner sees:

**Header:**
- Playlist Name & Cover Art (auto-collage or custom).
- Share Button (Toggle Public/Private).
- Settings.

**Content:**
- Track list with play buttons.
- Drag handles for reordering.
- Remove track from playlist.

---

# 11. Inside Playlist (Viewer / Public View)

If a playlist is `Public` and link is shared:

Viewer sees:
**Header:**
- Playlist name.
- Uploader's username (small, subtle).
- Report button (DMCA).

**Content:**
- Listen to tracks.
- Continuous playback.

Viewer cannot:
- See the uploader's private tracks.
- See other playlists unless explicitly shared.
- Edit or reorder tracks.
- Leave comments or likes.

---

# 12. Sharing Flow

Owner clicks Share on a Playlist.

**Options:**
- Toggle `isPublic` to ON.
- Copy beautiful short link.
- Download vertical UI Card for Stories.

**Revocation:**
- Owner toggles `isPublic` to OFF.
- All existing shared links instantly return a 404/Private error. No complex token management needed for MVP, just a strict boolean gate.

---

# 13. Reactions & Social Metrics

**REMOVED.**
- Listening is a private, emotional experience.
- No visible like counters.
- No view counters.
- No public engagement metrics to prevent herd behavior and comparison.

---

# 14. Reporting (Legal Compliance)

User can report:
- Public Playlist
- Specific Public Track (Copyright infringement)

**Flow:**
- Select reason (e.g., DMCA / Illegal content).
- Submit.

Reports are stored for Admin review.
If approved -> Admin triggers "Soft Takedown" (`isPublic` set to false).
Invisible to other users.

---

# 15. Profile Visibility

User profile (`/user/username`) is visible only if they have at least one `Public` playlist.
Displays: Avatar, Username, Bio, and a grid of Public Playlists.

Profiles without public playlists return a 404 to strangers.
No searchable public directory.

---

# 16. Security & UX Principles

- **Zero Trust:** All track access validated server-side.
- **Continuous Audio:** Zustand state manager ensures music never stops during navigation.
- **Calm Interface:** Deep dark backgrounds, glassmorphism, slow animations.
- **No Gamification:** No followers, no likes, no algorithms.

Stillum must feel:
**Private. Intentional. Controlled. Premium.**
