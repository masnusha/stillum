"use server";

import { getServerSession } from "next-auth";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { s3, S3_BUCKET, S3_PUBLIC_BASE } from "@/lib/s3";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_AUDIO_TYPES = new Set(["audio/mpeg", "audio/wav"]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;  // 15 MB
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;  // 10 MB
const PRESIGN_TTL = 5 * 60;                // 5 minutes

// ─── Types ────────────────────────────────────────────────────────────────────

type PresignResult =
  | { presignedUrl: string; fileKey: string }
  | { error: string };

type CreateTrackResult =
  | { trackId: string }
  | { error: string };

export interface TrackMetadata {
  title: string;
  artist: string;
  genre?: string;
  releaseDate?: string;
  recordLabel?: string;
  buyLink?: string;
  isExplicit?: boolean;
  isPublic?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip HTML/XSS chars and trim. SECURITY.md §9. */
function sanitize(value: string, maxLen = 200): string {
  return value.replace(/[<>"'&]/g, "").trim().slice(0, maxLen);
}

function presign(fileKey: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: fileKey,
    ContentType: contentType,
    // ContentLength omitted — browsers cannot set it explicitly (forbidden header).
  });
  return getSignedUrl(s3, command, { expiresIn: PRESIGN_TTL });
}

// ─── getPresignedUrl (audio) ──────────────────────────────────────────────────

export async function getPresignedUrl(
  fileName: string,
  fileType: string,
  fileSize: number
): Promise<PresignResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (!ALLOWED_AUDIO_TYPES.has(fileType))
    return { error: "Only MP3 and WAV files are supported." };
  if (fileSize > MAX_AUDIO_BYTES)
    return { error: "File exceeds the 15 MB limit." };
  if (!fileName || fileName.length > 260)
    return { error: "Invalid file name." };

  const ext = fileType === "audio/wav" ? "wav" : "mp3";
  const fileKey = `audio/${session.user.id}/${uuidv4()}.${ext}`;
  const presignedUrl = await presign(fileKey, fileType);

  return { presignedUrl, fileKey };
}

// ─── getImagePresignedUrl (cover art) ────────────────────────────────────────

export async function getImagePresignedUrl(
  fileType: string,
  fileSize: number
): Promise<PresignResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (!ALLOWED_IMAGE_TYPES.has(fileType))
    return { error: "Only JPEG, PNG and WebP images are supported." };
  if (fileSize > MAX_IMAGE_BYTES)
    return { error: "Cover image exceeds the 10 MB limit." };

  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extMap[fileType] ?? "jpg";
  const fileKey = `covers/${session.user.id}/${uuidv4()}.${ext}`;
  const presignedUrl = await presign(fileKey, fileType);

  return { presignedUrl, fileKey };
}

// ─── createTrackRecord ────────────────────────────────────────────────────────

export async function createTrackRecord(
  fileKey: string,
  metadata: TrackMetadata,
  coverKey?: string,
  duration?: number
): Promise<CreateTrackResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  // Validate fileKey ownership — prevents IDOR (ACCESS_RULES.md §1).
  if (!fileKey.startsWith(`audio/${session.user.id}/`))
    return { error: "Invalid file key." };

  // Validate coverKey ownership if provided.
  if (coverKey && !coverKey.startsWith(`covers/${session.user.id}/`))
    return { error: "Invalid cover key." };

  // Sanitize all metadata server-side before DB write (SECURITY.md §9).
  const title       = sanitize(metadata.title)               || "Untitled";
  const artist      = sanitize(metadata.artist)              || "Unknown Artist";
  const genre       = metadata.genre       ? sanitize(metadata.genre, 80)       || undefined : undefined;
  const releaseDate = metadata.releaseDate ? sanitize(metadata.releaseDate, 20) || undefined : undefined;
  const recordLabel = metadata.recordLabel ? sanitize(metadata.recordLabel)     || undefined : undefined;
  const isExplicit  = Boolean(metadata.isExplicit);

  // buyLink: validate as a real http/https URL — never store arbitrary strings.
  let buyLink: string | undefined;
  if (metadata.buyLink?.trim()) {
    try {
      const parsed = new URL(metadata.buyLink.trim());
      if (["http:", "https:"].includes(parsed.protocol)) {
        buyLink = parsed.toString().slice(0, 500);
      }
    } catch {
      // Invalid URL — silently drop it rather than error out.
    }
  }

  const audioUrl = `${S3_PUBLIC_BASE}/${fileKey}`;
  const coverUrl = coverKey ? `${S3_PUBLIC_BASE}/${coverKey}` : undefined;

  const track = await prisma.track.create({
    data: {
      ownerId: session.user.id,
      title,
      artist,
      genre,
      releaseDate,
      recordLabel,
      buyLink,
      isExplicit,
      audioUrl,
      coverUrl,
      duration: (duration && isFinite(duration) && duration > 0) ? Math.round(duration) : 0,
      isPublic: Boolean(metadata.isPublic),
    },
    select: { id: true },
  });

  return { trackId: track.id };
}

// ─── updateTrack ──────────────────────────────────────────────────────────────

type UpdateResult = { error?: string };

/**
 * Updates track metadata and optionally replaces or removes the cover art.
 * SECURITY: session + ownership verified before any mutation.
 */
export async function updateTrack(
  trackId: string,
  metadata: TrackMetadata,
  newCoverKey?: string,
  removeCover?: boolean
): Promise<UpdateResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { id: true, ownerId: true, coverUrl: true },
  });

  if (!track)                              return { error: "Track not found." };
  if (track.ownerId !== session.user.id)   return { error: "Forbidden." };

  // Validate new cover key ownership if provided.
  if (newCoverKey && !newCoverKey.startsWith(`covers/${session.user.id}/`))
    return { error: "Invalid cover key." };

  // Sanitize metadata.
  const title       = sanitize(metadata.title)               || "Untitled";
  const artist      = sanitize(metadata.artist)              || "Unknown Artist";
  const genre       = metadata.genre       ? sanitize(metadata.genre, 80)       || undefined : undefined;
  const releaseDate = metadata.releaseDate ? sanitize(metadata.releaseDate, 20) || undefined : undefined;
  const recordLabel = metadata.recordLabel ? sanitize(metadata.recordLabel)     || undefined : undefined;
  const isExplicit  = Boolean(metadata.isExplicit);

  let buyLink: string | undefined;
  if (metadata.buyLink?.trim()) {
    try {
      const parsed = new URL(metadata.buyLink.trim());
      if (["http:", "https:"].includes(parsed.protocol)) {
        buyLink = parsed.toString().slice(0, 500);
      }
    } catch { /* drop invalid URL */ }
  }

  // Resolve cover changes.
  let coverUrl: string | null | undefined = undefined; // undefined = no change

  if (newCoverKey) {
    // Delete old cover from S3 if it exists.
    if (track.coverUrl) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: extractS3Key(track.coverUrl) }));
      } catch (err) {
        console.error("[updateTrack] S3 old cover delete failed:", err);
      }
    }
    coverUrl = `${S3_PUBLIC_BASE}/${newCoverKey}`;
  } else if (removeCover && track.coverUrl) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: extractS3Key(track.coverUrl) }));
    } catch (err) {
      console.error("[updateTrack] S3 cover remove failed:", err);
    }
    coverUrl = null;
  }

  await prisma.track.update({
    where: { id: trackId },
    data: {
      title,
      artist,
      genre:       genre       ?? null,
      releaseDate: releaseDate ?? null,
      recordLabel: recordLabel ?? null,
      buyLink:     buyLink     ?? null,
      isExplicit,
      isPublic: Boolean(metadata.isPublic),
      ...(coverUrl !== undefined ? { coverUrl } : {}),
    },
  });

  revalidatePath("/dashboard");
  return {};
}

// ─── updateTrackMetadata ──────────────────────────────────────────────────────

/**
 * Lightweight metadata-only update — no cover S3 operations.
 * Used by ExpandedPlayer edit flow. Same security guarantees as updateTrack.
 */
export async function updateTrackMetadata(
  trackId: string,
  data: TrackMetadata
): Promise<UpdateResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { id: true, ownerId: true },
  });

  if (!track)                            return { error: "Track not found." };
  if (track.ownerId !== session.user.id) return { error: "Forbidden." };

  const title       = sanitize(data.title)               || "Untitled";
  const artist      = sanitize(data.artist)              || "Unknown Artist";
  const genre       = data.genre       ? sanitize(data.genre, 80)       || null : null;
  const releaseDate = data.releaseDate ? sanitize(data.releaseDate, 20) || null : null;
  const recordLabel = data.recordLabel ? sanitize(data.recordLabel)     || null : null;
  const isExplicit  = Boolean(data.isExplicit);

  let buyLink: string | null = null;
  if (data.buyLink?.trim()) {
    try {
      const parsed = new URL(data.buyLink.trim());
      if (["http:", "https:"].includes(parsed.protocol))
        buyLink = parsed.toString().slice(0, 500);
    } catch { /* drop invalid URL */ }
  }

  await prisma.track.update({
    where: { id: trackId },
    data: { title, artist, genre, releaseDate, recordLabel, buyLink, isExplicit, isPublic: Boolean(data.isPublic) },
  });

  revalidatePath("/dashboard");
  return {};
}

// ─── deleteTrack ──────────────────────────────────────────────────────────────

type DeleteResult = { error?: string };

/** Parses the S3 object key from a public storage URL. */
function extractS3Key(url: string): string {
  try {
    // e.g. https://pub-xxx.r2.dev/audio/userId/uuid.mp3  →  audio/userId/uuid.mp3
    return new URL(url).pathname.slice(1);
  } catch {
    return url;
  }
}

/**
 * Permanently deletes a track from S3 and the database.
 * SECURITY: verifies session + ownership before any mutation.
 * ACCESS_RULES.md §9 — cascade deletes PlaylistTrack via Prisma schema.
 */
export async function deleteTrack(trackId: string): Promise<DeleteResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  // Fetch track and verify ownership — prevents IDOR (ACCESS_RULES.md §1).
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { id: true, ownerId: true, audioUrl: true, coverUrl: true },
  });

  if (!track) return { error: "Track not found." };
  if (track.ownerId !== session.user.id) return { error: "Forbidden." };

  // Delete audio from S3 (best-effort — DB deletion proceeds even if S3 fails).
  try {
    await s3.send(
      new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: extractS3Key(track.audioUrl) })
    );
  } catch (err) {
    console.error("[deleteTrack] S3 audio delete failed:", err);
  }

  // Delete cover from S3 if present.
  if (track.coverUrl) {
    try {
      await s3.send(
        new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: extractS3Key(track.coverUrl) })
      );
    } catch (err) {
      console.error("[deleteTrack] S3 cover delete failed:", err);
    }
  }

  // Remove from DB — schema cascades to PlaylistTrack (ACCESS_RULES.md §9).
  await prisma.track.delete({ where: { id: trackId } });

  revalidatePath("/dashboard");
  return {};
}
