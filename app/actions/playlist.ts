"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { s3, S3_BUCKET, S3_PUBLIC_BASE } from "@/lib/s3";

// ─── Types ────────────────────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const PRESIGN_TTL = 5 * 60;

type PresignResult =
  | { presignedUrl: string; fileKey: string }
  | { error: string };

// ─── getPlaylistCoverPresignedUrl ─────────────────────────────────────────────

export async function getPlaylistCoverPresignedUrl(
  mimeType: string,
  size: number,
): Promise<PresignResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Не авторизован" };

  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) return { error: "Недопустимый тип файла" };
  if (size > MAX_IMAGE_BYTES) return { error: "Файл слишком большой (макс. 10 МБ)" };

  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const fileKey = `covers/playlist-${uuidv4()}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket:      S3_BUCKET,
    Key:         fileKey,
    ContentType: mimeType,
    ContentLength: size,
  });

  const presignedUrl = await getSignedUrl(s3, cmd, { expiresIn: PRESIGN_TTL });
  return { presignedUrl, fileKey };
}

// ─── createPlaylist ───────────────────────────────────────────────────────────

interface CreatePlaylistInput {
  name:        string;
  description: string;
  isPublic:    boolean;
  coverKey:    string | null; // S3 key, null if no cover uploaded
}

type CreatePlaylistResult =
  | { playlistId: string }
  | { error: string };

export async function createPlaylist(
  input: CreatePlaylistInput,
): Promise<CreatePlaylistResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Не авторизован" };

  const name = input.name.trim();
  if (!name) return { error: "Название обязательно" };
  if (name.length > 100) return { error: "Название не более 100 символов" };

  const coverUrl = input.coverKey ? `${S3_PUBLIC_BASE}/${input.coverKey}` : null;

  const playlist = await prisma.playlist.create({
    data: {
      ownerId:     session.user.id,
      name,
      description: input.description.trim() || null,
      isPublic:    input.isPublic,
      coverUrl,
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/playlists");
  return { playlistId: playlist.id };
}

// ─── updatePlaylist ───────────────────────────────────────────────────────────

interface UpdatePlaylistInput {
  name:        string;
  description: string;
  isPublic:    boolean;
  coverKey:    string | null; // null = no change, string = new S3 key
}

export async function updatePlaylist(
  playlistId: string,
  input: UpdatePlaylistInput,
): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Не авторизован" };

  const name = input.name.trim();
  if (!name)             return { error: "Название не может быть пустым" };
  if (name.length > 100) return { error: "Название не более 100 символов" };
  if (input.description.length > 300) return { error: "Описание не более 300 символов" };

  const playlist = await prisma.playlist.findUnique({
    where:  { id: playlistId },
    select: { ownerId: true },
  });
  if (!playlist || playlist.ownerId !== session.user.id) return { error: "Плейлист не найден" };

  await prisma.playlist.update({
    where: { id: playlistId },
    data: {
      name,
      description: input.description.trim() || null,
      isPublic:    input.isPublic,
      ...(input.coverKey ? { coverUrl: `${S3_PUBLIC_BASE}/${input.coverKey}` } : {}),
    },
  });

  revalidatePath(`/dashboard/playlists/${playlistId}`);
  revalidatePath("/dashboard/playlists");
  return {};
}

// ─── updatePlaylistName ───────────────────────────────────────────────────────

export async function updatePlaylistName(
  playlistId: string,
  name: string,
): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Не авторизован" };

  const trimmed = name.trim();
  if (!trimmed)           return { error: "Название не может быть пустым" };
  if (trimmed.length > 100) return { error: "Название не более 100 символов" };

  const playlist = await prisma.playlist.findUnique({
    where:  { id: playlistId },
    select: { ownerId: true },
  });
  if (!playlist || playlist.ownerId !== session.user.id) return { error: "Плейлист не найден" };

  await prisma.playlist.update({
    where: { id: playlistId },
    data:  { name: trimmed },
  });

  revalidatePath(`/dashboard/playlists/${playlistId}`);
  revalidatePath("/dashboard/playlists");
  return {};
}

// ─── updatePlaylistDescription ────────────────────────────────────────────────

export async function updatePlaylistDescription(
  playlistId: string,
  description: string,
): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Не авторизован" };

  if (description.length > 300) return { error: "Описание не более 300 символов" };

  const playlist = await prisma.playlist.findUnique({
    where:  { id: playlistId },
    select: { ownerId: true },
  });
  if (!playlist || playlist.ownerId !== session.user.id) return { error: "Плейлист не найден" };

  await prisma.playlist.update({
    where: { id: playlistId },
    data:  { description: description.trim() || null },
  });

  revalidatePath(`/dashboard/playlists/${playlistId}`);
  return {};
}

// ─── updatePlaylistCover ──────────────────────────────────────────────────────

export async function updatePlaylistCover(
  playlistId: string,
  coverKey: string,
): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Не авторизован" };

  const playlist = await prisma.playlist.findUnique({
    where:  { id: playlistId },
    select: { ownerId: true },
  });
  if (!playlist || playlist.ownerId !== session.user.id) return { error: "Плейлист не найден" };

  await prisma.playlist.update({
    where: { id: playlistId },
    data:  { coverUrl: `${S3_PUBLIC_BASE}/${coverKey}` },
  });

  revalidatePath(`/dashboard/playlists/${playlistId}`);
  revalidatePath("/dashboard/playlists");
  return {};
}

// ─── getPlaylists ─────────────────────────────────────────────────────────────

export async function getPlaylists() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  return prisma.playlist.findMany({
    where:   { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id:          true,
      name:        true,
      description: true,
      coverUrl:    true,
      isPublic:    true,
      createdAt:   true,
      _count: { select: { playlistTracks: true } },
    },
  });
}

// ─── getPlaylistWithTracks ────────────────────────────────────────────────────

export async function getPlaylistWithTracks(playlistId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const playlist = await prisma.playlist.findUnique({
    where:  { id: playlistId },
    select: {
      id:          true,
      name:        true,
      description: true,
      coverUrl:    true,
      isPublic:    true,
      ownerId:     true,
      createdAt:   true,
      owner: { select: { username: true, name: true } },
      playlistTracks: {
        orderBy: { position: "asc" },
        select: {
          id:       true,
          position: true,
          addedAt:  true,
          track: {
            select: {
              id:       true,
              title:    true,
              artist:   true,
              duration: true,
              coverUrl: true,
              audioUrl: true,
              isPublic: true,
            },
          },
        },
      },
    },
  });

  if (!playlist) return null;
  // Only owner can see private playlists
  if (!playlist.isPublic && playlist.ownerId !== session.user.id) return null;

  return playlist;
}

// ─── removeTrackFromPlaylist ──────────────────────────────────────────────────

export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string,
): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Не авторизован" };

  // Verify ownership of playlist (IDOR guard)
  const playlist = await prisma.playlist.findUnique({
    where:  { id: playlistId },
    select: { ownerId: true },
  });
  if (!playlist || playlist.ownerId !== session.user.id) return { error: "Плейлист не найден" };

  await prisma.playlistTrack.deleteMany({
    where: { playlistId, trackId },
  });

  revalidatePath(`/dashboard/playlists/${playlistId}`);
  return {};
}

// ─── addTrackToPlaylist ───────────────────────────────────────────────────────

export async function addTrackToPlaylist(
  playlistId: string,
  trackId: string,
): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Не авторизован" };

  // Verify ownership of playlist
  const playlist = await prisma.playlist.findUnique({
    where:  { id: playlistId },
    select: { ownerId: true },
  });
  if (!playlist || playlist.ownerId !== session.user.id) return { error: "Плейлист не найден" };

  // Verify ownership of track
  const track = await prisma.track.findUnique({
    where:  { id: trackId },
    select: { ownerId: true },
  });
  if (!track || track.ownerId !== session.user.id) return { error: "Трек не найден" };

  // Get next position
  const last = await prisma.playlistTrack.findFirst({
    where:   { playlistId },
    orderBy: { position: "desc" },
    select:  { position: true },
  });
  const position = (last?.position ?? -1) + 1;

  await prisma.playlistTrack.upsert({
    where:  { playlistId_trackId: { playlistId, trackId } },
    update: {},
    create: { playlistId, trackId, position },
  });

  revalidatePath(`/dashboard/playlists/${playlistId}`);
  return {};
}
