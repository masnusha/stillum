"use server";

import { getServerSession } from "next-auth";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl }      from "@aws-sdk/s3-request-presigner";
import { revalidatePath }    from "next/cache";
import { v4 as uuidv4 }     from "uuid";
import { authOptions }       from "@/auth";
import { prisma }            from "@/lib/prisma";
import { s3, S3_BUCKET, S3_PUBLIC_BASE } from "@/lib/s3";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg", "audio/mp3",
  "audio/wav",  "audio/x-wav", "audio/vnd.wave",
  "audio/flac", "audio/x-flac",
]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AUDIO_BYTES  = 100 * 1024 * 1024;
const MAX_IMAGE_BYTES  = 10 * 1024 * 1024;
const PRESIGN_TTL      = 5 * 60; // 5 minutes

// ─── Audio helpers ────────────────────────────────────────────────────────────

const AUDIO_EXT_RE = /\.(mp3|wav|flac)$/i;

/** Accept by MIME type OR by file extension (some browsers emit non-standard types). */
function isValidAudioFile(fileType: string, fileName: string): boolean {
  return ALLOWED_AUDIO_TYPES.has(fileType) || AUDIO_EXT_RE.test(fileName);
}

/** Derive the storage extension from MIME type, falling back to filename. */
function deriveAudioExt(fileType: string, fileName: string): "mp3" | "wav" | "flac" {
  if (fileType === "audio/wav" || fileType === "audio/x-wav" || fileType === "audio/vnd.wave") return "wav";
  if (fileType === "audio/flac" || fileType === "audio/x-flac") return "flac";
  if (fileType === "audio/mpeg" || fileType === "audio/mp3")    return "mp3";
  if (/\.wav$/i.test(fileName))  return "wav";
  if (/\.flac$/i.test(fileName)) return "flac";
  return "mp3";
}

/** Normalize to a canonical MIME type for S3 Content-Type (handles empty / exotic types). */
function normalizeAudioMime(fileType: string, fileName: string): string {
  if (ALLOWED_AUDIO_TYPES.has(fileType)) return fileType;
  if (/\.wav$/i.test(fileName))  return "audio/wav";
  if (/\.flac$/i.test(fileName)) return "audio/flac";
  return "audio/mpeg";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PresignResult =
  | { presignedUrl: string; fileKey: string }
  | { error: string };

export interface TrackPayload {
  fileKey:         string;
  title:           string;
  duration:        number;
  featuredArtists?: string;
  order:           number;
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

  if (!isValidAudioFile(fileType, fileName))
    return { error: "Only MP3, WAV and FLAC files are supported." };
  if (fileSize > MAX_AUDIO_BYTES)
    return { error: "File exceeds the 100 MB limit." };
  if (!fileName || fileName.length > 260)
    return { error: "Invalid file name." };

  const ext  = deriveAudioExt(fileType, fileName);
  const mime = normalizeAudioMime(fileType, fileName);

  const fileKey     = `audio/${session.user.id}/${uuidv4()}.${ext}`;
  const presignedUrl = await presign(fileKey, mime);
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

// ─── getBatchAudioPresignedUrls ───────────────────────────────────────────────
// Validates session ONCE and returns presigned URLs for all audio files together.
// This prevents N sequential DB hits (one per track) from exhausting the Railway
// PostgreSQL connection pool on multi-track releases.

export interface AudioFileSpec {
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface AudioPresignItem {
  presignedUrl: string;
  fileKey:      string;
  contentType:  string; // normalized MIME to use as Content-Type on the PUT
}

type BatchPresignResult =
  | { items: AudioPresignItem[] }
  | { error: string };

export async function getBatchAudioPresignedUrls(
  specs: AudioFileSpec[],
): Promise<BatchPresignResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)             return { error: "Unauthorized" };
  if (session.user.role !== "ARTIST") return { error: "Artist account required." };
  if (specs.length === 0)             return { error: "No files provided." };

  const items: AudioPresignItem[] = [];

  for (const spec of specs) {
    if (!isValidAudioFile(spec.fileType, spec.fileName))
      return { error: `"${spec.fileName}" — поддерживаются только MP3, WAV и FLAC.` };
    if (spec.fileSize > MAX_AUDIO_BYTES)
      return { error: `"${spec.fileName}" превышает лимит 100 МБ.` };
    if (!spec.fileName || spec.fileName.length > 260)
      return { error: "Недопустимое имя файла." };

    const ext         = deriveAudioExt(spec.fileType, spec.fileName);
    const contentType = normalizeAudioMime(spec.fileType, spec.fileName);
    const fileKey     = `audio/${session.user.id}/${uuidv4()}.${ext}`;
    const presignedUrl = await presign(fileKey, contentType);

    items.push({ presignedUrl, fileKey, contentType });
  }

  return { items };
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
        ownerId:         uid,
        albumId:         newAlbum.id,
        title:           sanitize(t.title) || `Track ${i + 1}`,
        artist:          artistName,
        audioUrl:        `${S3_PUBLIC_BASE}/${t.fileKey}`,
        coverUrl:        coverImageUrl,
        duration:        isFinite(t.duration) && t.duration > 0 ? Math.round(t.duration) : 0,
        isPublic:        true,
        genre,
        releaseDate,
        order:           t.order,
        featuredArtists: t.featuredArtists ? sanitize(t.featuredArtists, 300) || undefined : undefined,
      })),
    });

    return newAlbum;
  });

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/studio");
  return { albumId: album.id };
}

// ─── updateReleaseFull ────────────────────────────────────────────────────────
// Updates album metadata + all track metadata/order in one atomic transaction.
// Tracks absent from the payload are deleted from the DB.

export interface EditTrackPayload {
  id:               string;
  title:            string;
  featuredArtists?: string;
  order:            number;
}

export interface UpdateReleaseFullData {
  title:            string;
  featuredArtists?: string;
  genre?:           string;
  language?:        string;
  label?:           string;
  tracks:           EditTrackPayload[];
}

export async function updateReleaseFull(
  albumId: string,
  data: UpdateReleaseFullData,
): Promise<UpdateResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)             return { error: "Unauthorized" };
  if (session.user.role !== "ARTIST") return { error: "Artist account required." };

  const existing = await prisma.album.findUnique({
    where:  { id: albumId },
    select: { artistId: true, tracks: { select: { id: true } } },
  });
  if (!existing)                             return { error: "Release not found." };
  if (existing.artistId !== session.user.id) return { error: "Access denied." };

  // IDOR: every submitted track ID must belong to this album
  const albumTrackIds = new Set(existing.tracks.map(t => t.id));
  for (const t of data.tracks) {
    if (!albumTrackIds.has(t.id)) return { error: "Invalid track ID." };
  }

  // Tracks absent from submission have been removed by the user
  const submittedIds = new Set(data.tracks.map(t => t.id));
  const deletedIds   = existing.tracks
    .filter(t => !submittedIds.has(t.id))
    .map(t => t.id);

  await prisma.$transaction(async tx => {
    // 1. Update album metadata
    await tx.album.update({
      where: { id: albumId },
      data: {
        title:           sanitize(data.title) || "Untitled",
        featuredArtists: data.featuredArtists ? sanitize(data.featuredArtists, 300) || null : null,
        genre:           data.genre     ? sanitize(data.genre, 80)    || null : null,
        language:        data.language  ? sanitize(data.language, 80) || null : null,
        label:           data.label     ? sanitize(data.label)        || null : null,
      },
    });

    // 2. Update each surviving track
    for (const t of data.tracks) {
      await tx.track.update({
        where: { id: t.id },
        data: {
          title:           sanitize(t.title) || "Untitled",
          featuredArtists: t.featuredArtists ? sanitize(t.featuredArtists, 300) || null : null,
          order:           t.order,
        },
      });
    }

    // 3. Delete removed tracks (cascade removes PlaylistTrack rows)
    if (deletedIds.length > 0) {
      await tx.track.deleteMany({ where: { id: { in: deletedIds } } });
    }
  });

  revalidatePath(`/dashboard/studio/release/${albumId}`);
  revalidatePath("/dashboard/studio");
  return { success: true };
}

// ─── updateRelease ────────────────────────────────────────────────────────────

export interface UpdateReleaseData {
  title:            string;
  featuredArtists?: string;
  genre?:           string;
  language?:        string;
  label?:           string;
}

type UpdateResult = { success: true } | { error: string };

export async function updateRelease(
  albumId: string,
  data: UpdateReleaseData,
): Promise<UpdateResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)             return { error: "Unauthorized" };
  if (session.user.role !== "ARTIST") return { error: "Artist account required." };

  // IDOR: verify ownership before touching the record
  const existing = await prisma.album.findUnique({
    where:  { id: albumId },
    select: { artistId: true },
  });
  if (!existing)                               return { error: "Release not found." };
  if (existing.artistId !== session.user.id)   return { error: "Access denied." };

  await prisma.album.update({
    where: { id: albumId },
    data: {
      title:           sanitize(data.title)               || "Untitled",
      featuredArtists: data.featuredArtists ? sanitize(data.featuredArtists, 300) || null : null,
      genre:           data.genre     ? sanitize(data.genre, 80) || null : null,
      language:        data.language  ? sanitize(data.language, 80) || null : null,
      label:           data.label     ? sanitize(data.label) || null : null,
    },
  });

  revalidatePath(`/dashboard/studio/release/${albumId}`);
  revalidatePath("/dashboard/studio");
  return { success: true };
}

// ─── deleteRelease ────────────────────────────────────────────────────────────

type DeleteResult = { success: true } | { error: string };

export async function deleteRelease(albumId: string): Promise<DeleteResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)             return { error: "Unauthorized" };
  if (session.user.role !== "ARTIST") return { error: "Artist account required." };

  // IDOR: fetch album + track file URLs for cleanup
  const album = await prisma.album.findUnique({
    where:  { id: albumId },
    select: {
      artistId:   true,
      coverImage: true,
      tracks: { select: { audioUrl: true } },
    },
  });
  if (!album)                               return { error: "Release not found." };
  if (album.artistId !== session.user.id)   return { error: "Access denied." };

  // ── Collect S3 keys to delete ──────────────────────────────────────────────
  const base = S3_PUBLIC_BASE + "/";
  const keysToDelete: string[] = [];

  const extractKey = (url: string | null) => {
    if (url?.startsWith(base)) keysToDelete.push(url.slice(base.length));
  };

  extractKey(album.coverImage);
  for (const track of album.tracks) extractKey(track.audioUrl);

  // ── Delete S3 objects (best-effort — DB delete must still succeed) ─────────
  await Promise.allSettled(
    keysToDelete.map(key =>
      s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }))
    ),
  );

  // ── Delete DB record (cascade removes Track + PlaylistTrack rows) ──────────
  await prisma.album.delete({ where: { id: albumId } });

  revalidatePath("/dashboard/studio");
  revalidatePath("/dashboard/profile");
  return { success: true };
}
