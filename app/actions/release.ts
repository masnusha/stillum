"use server";

import { getServerSession } from "next-auth";
import { PutObjectCommand }  from "@aws-sdk/client-s3";
import { getSignedUrl }      from "@aws-sdk/s3-request-presigner";
import { revalidatePath }    from "next/cache";
import { v4 as uuidv4 }     from "uuid";
import { authOptions }       from "@/auth";
import { prisma }            from "@/lib/prisma";
import { s3, S3_BUCKET, S3_PUBLIC_BASE } from "@/lib/s3";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg", "audio/wav", "audio/flac", "audio/x-flac",
]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AUDIO_BYTES  = 15 * 1024 * 1024;
const MAX_IMAGE_BYTES  = 10 * 1024 * 1024;
const PRESIGN_TTL      = 5 * 60; // 5 minutes

// ─── Types ────────────────────────────────────────────────────────────────────

type PresignResult =
  | { presignedUrl: string; fileKey: string }
  | { error: string };

export interface TrackPayload {
  fileKey:  string;
  title:    string;
  duration: number;
}

export interface ReleasePayload {
  title:            string;
  type:             string;   // "SINGLE" | "EP" | "ALBUM"
  coverKey?:        string;
  featuredArtists?: string;
  genre?:           string;
  releaseDate?:     string;   // ISO date string e.g. "2026-03-14"
  language?:        string;
  label?:           string;
  tracks:           TrackPayload[];
}

type PublishResult =
  | { albumId: string }
  | { error: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip HTML/XSS chars and trim. SECURITY.md §9. */
function sanitize(value: string, maxLen = 200): string {
  return value.replace(/[<>"'&]/g, "").trim().slice(0, maxLen);
}

function presign(fileKey: string, contentType: string): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: S3_BUCKET, Key: fileKey, ContentType: contentType }),
    { expiresIn: PRESIGN_TTL },
  );
}

// ─── getReleaseAudioPresignedUrl ──────────────────────────────────────────────
// Like getPresignedUrl in track.ts but also supports FLAC (artist releases).

export async function getReleaseAudioPresignedUrl(
  fileName: string,
  fileType: string,
  fileSize: number,
): Promise<PresignResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };
  if (session.user.role !== "ARTIST") return { error: "Artist account required." };

  if (!ALLOWED_AUDIO_TYPES.has(fileType))
    return { error: "Only MP3, WAV and FLAC files are supported." };
  if (fileSize > MAX_AUDIO_BYTES)
    return { error: "File exceeds the 15 MB limit." };
  if (!fileName || fileName.length > 260)
    return { error: "Invalid file name." };

  const ext =
    fileType === "audio/wav"                           ? "wav"  :
    fileType === "audio/flac" || fileType === "audio/x-flac" ? "flac" : "mp3";

  const fileKey     = `audio/${session.user.id}/${uuidv4()}.${ext}`;
  const presignedUrl = await presign(fileKey, fileType);
  return { presignedUrl, fileKey };
}

// ─── getReleaseImagePresignedUrl ──────────────────────────────────────────────

export async function getReleaseImagePresignedUrl(
  fileType: string,
  fileSize: number,
): Promise<PresignResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };
  if (session.user.role !== "ARTIST") return { error: "Artist account required." };

  if (!ALLOWED_IMAGE_TYPES.has(fileType))
    return { error: "Only JPEG, PNG and WebP images are supported." };
  if (fileSize > MAX_IMAGE_BYTES)
    return { error: "Cover image exceeds the 10 MB limit." };

  const extMap: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  };
  const ext      = extMap[fileType] ?? "jpg";
  const fileKey  = `covers/${session.user.id}/${uuidv4()}.${ext}`;
  const presignedUrl = await presign(fileKey, fileType);
  return { presignedUrl, fileKey };
}

// ─── publishRelease ───────────────────────────────────────────────────────────

export async function publishRelease(payload: ReleasePayload): Promise<PublishResult> {
  // ── Auth + role gate ───────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };
  if (session.user.role !== "ARTIST") return { error: "Artist account required." };

  const uid = session.user.id;

  // ── Cover is mandatory for official releases ──────────────────────────────
  if (!payload.coverKey) return { error: "cover_required" };

  // ── Validate file key ownership (IDOR prevention) ─────────────────────────
  if (!payload.coverKey.startsWith(`covers/${uid}/`))
    return { error: "Invalid cover key." };
  for (const t of payload.tracks) {
    if (!t.fileKey.startsWith(`audio/${uid}/`))
      return { error: "Invalid audio key." };
  }

  // ── Sanitize all text fields ───────────────────────────────────────────────
  const title           = sanitize(payload.title)                     || "Untitled";
  const type            = sanitize(payload.type, 10)                  || "SINGLE";
  const featuredArtists = payload.featuredArtists
    ? sanitize(payload.featuredArtists, 300) || undefined
    : undefined;
  const genre     = payload.genre     ? sanitize(payload.genre, 80)   || undefined : undefined;
  const language  = payload.language  ? sanitize(payload.language, 80) || undefined : undefined;
  const label     = payload.label     ? sanitize(payload.label)       || undefined : undefined;
  const releaseDate = payload.releaseDate
    ? sanitize(payload.releaseDate, 20) || undefined
    : undefined;

  // ── Resolve artist display name for Track.artist field ────────────────────
  const dbUser = await prisma.user.findUnique({
    where:  { id: uid },
    select: { name: true, username: true },
  });
  const artistName = dbUser?.username ?? dbUser?.name ?? "Unknown Artist";

  // ── Resolve URLs ──────────────────────────────────────────────────────────
  const coverImageUrl = payload.coverKey
    ? `${S3_PUBLIC_BASE}/${payload.coverKey}`
    : undefined;

  // ── Atomic DB transaction: Album + Tracks ─────────────────────────────────
  // Using interactive transaction so we can reference the created albumId.
  const album = await prisma.$transaction(async (tx) => {
    const newAlbum = await tx.album.create({
      data: {
        artistId:        uid,
        title,
        type,
        coverImage:      coverImageUrl,
        featuredArtists,
        genre,
        releaseDate,
        language,
        label,
        isPublic:        true, // Albums are public by default
      },
      select: { id: true },
    });

    // Create one Track per uploaded audio file, all linked to this album.
    await tx.track.createMany({
      data: payload.tracks.map((t, i) => ({
        ownerId:    uid,
        albumId:    newAlbum.id,
        title:      sanitize(t.title) || `Track ${i + 1}`,
        artist:     artistName,
        audioUrl:   `${S3_PUBLIC_BASE}/${t.fileKey}`,
        coverUrl:   coverImageUrl,
        duration:   isFinite(t.duration) && t.duration > 0 ? Math.round(t.duration) : 0,
        isPublic:   true,
        genre,
        releaseDate,
      })),
    });

    return newAlbum;
  });

  revalidatePath("/dashboard/profile");
  return { albumId: album.id };
}
