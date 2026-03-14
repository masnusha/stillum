# Stillum – Authentication Architecture (MVP)

## Overview
This document defines the authentication, session management, and access control layer for Stillum.
Authentication is handled via **Auth.js (NextAuth.js)** integrated with **Prisma ORM** and PostgreSQL.
Stillum relies on a trusted OAuth and Email approach to maximize security and user experience while strictly maintaining our privacy-first philosophy.

## 1. Authentication Methods
- **Google OAuth:** Fast, secure, industry standard.
- **Email (Credentials / Magic Links):** For users who demand absolute privacy and do not want to link third-party social accounts.
*(Note: Social networks with high censorship or privacy concerns were explicitly rejected to maintain the "private safe haven" brand identity).*

## 2. Core Auth Entities (Prisma Adapter)
Auth.js automatically manages these tables to ensure secure session handling:
- **User:** The core identity (email, username, avatar).
- **Account:** Links the `User` to an OAuth provider (e.g., Google). A user can have multiple accounts linked to one email.
- **Session:** Tracks active login sessions, stored in the database for immediate revocation capabilities.
- **VerificationToken:** Temporarily stores secure hashes for email verification.

## 3. Session Management
- **Strategy:** Database-backed sessions.
- **Cookies:** `httpOnly`, `Secure` (in production), `SameSite=Lax`.
- **Middleware Protection:** Next.js Middleware checks the session token on all private routes. Unauthenticated users are strictly redirected to `/login`.

## 4. User Access & Suspension
If `User.isSuspended = true`:
- Block login at the Auth.js `signIn` callback.
- Invalidate active sessions.
- Prevent new sessions from being generated.
- Return a generic "Access Denied" error to prevent enumeration.

## 5. Abuse Prevention
- Rate limit login attempts.
- Rate limit magic link generation / password resets.
- Email normalization (e.g., treating `user+spam@gmail.com` and `user@gmail.com` as the same) to prevent account duplication.
- Optional captcha (e.g., Cloudflare Turnstile) for excessive attempts on the UI.

## 6. Edge Cases
The system must gracefully handle:
- Token expired during click.
- Token reused.
- OAuth provider returns an email already linked to another method (Secure account linking).
- User deletes account and tries to re-login.
- Simultaneous login attempts.
- Device switching.
*Crucial: All cases must return safe, non-revealing error messages to the client.*

## 7. Future Enhancements
- Device-based session management (view and revoke active sessions in UI).
- Admin session invalidation panel.
- Two-factor authentication (2FA).
- WebAuthn (Passkeys / FaceID / TouchID) support.

## 8. Philosophy Reminder
Authentication must feel:
- Effortless
- Modern
- Invisible (Aesthetic UI, zero friction)

But under the hood, it must be:
- Strict
- Server-validated (Zero Trust)
- Secure
- Minimal attack surface
