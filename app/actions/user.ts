"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { s3, S3_BUCKET, S3_PUBLIC_BASE } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

type Result = { error?: string };

// ─── updateUserProfile ────────────────────────────────────────────────────────

export async function updateUserProfile(data: {
  username?: string;
  bio?: string;
}): Promise<Result> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const username = data.username?.trim().slice(0, 40) ?? undefined;
  const bio      = data.bio?.trim().slice(0, 300)      ?? undefined;

  if (username !== undefined) {
    // Uniqueness check (exclude self)
    const conflict = await prisma.user.findFirst({
      where: { username, NOT: { id: session.user.id } },
      select: { id: true },
    });
    if (conflict) return { error: "Этот никнейм уже занят." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { username, bio },
  });

  revalidatePath("/dashboard/profile");
  return {};
}

// ─── updateProfile ────────────────────────────────────────────────────────────

export async function updateProfile(data: {
  username:        string;
  bio:             string;
  telegramLink:    string;
  vkLink:          string;
  yandexMusicLink: string;
  customLink:      string;
  statusEmoji:     string | null;
}): Promise<Result> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  const username        = data.username.trim().slice(0, 40)         || null;
  const bio             = data.bio.trim().slice(0, 300)             || null;
  const telegramLink    = data.telegramLink.trim().slice(0, 200)    || null;
  const vkLink          = data.vkLink.trim().slice(0, 200)          || null;
  const yandexMusicLink = data.yandexMusicLink.trim().slice(0, 200) || null;
  const customLink      = data.customLink.trim().slice(0, 200)      || null;

  if (username) {
    const conflict = await prisma.user.findFirst({
      where: { username, NOT: { id: session.user.id } },
      select: { id: true },
    });
    if (conflict) return { error: "Этот никнейм уже занят." };
  }

  // statusEmoji is only persisted for PLUS users — gate server-side
  let statusEmoji: string | null = null;
  if (data.statusEmoji !== null) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });
    if (dbUser?.plan === "PLUS") statusEmoji = data.statusEmoji;
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { username, bio, telegramLink, vkLink, yandexMusicLink, customLink, statusEmoji },
  });

  revalidatePath("/dashboard/profile");
  return {};
}

// ─── getAvatarPresignedUrl ────────────────────────────────────────────────────

const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function getAvatarPresignedUrl(
  fileType: string,
  fileSize: number
): Promise<{ presignedUrl: string; fileKey: string } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (!ALLOWED_IMAGE.has(fileType)) return { error: "Only JPEG, PNG or WebP." };
  if (fileSize > 10 * 1024 * 1024)  return { error: "Avatar exceeds 10 MB." };

  const ext = fileType === "image/png" ? "png" : fileType === "image/webp" ? "webp" : "jpg";
  const fileKey = `avatars/${session.user.id}/${uuidv4()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: fileKey,
    ContentType: fileType,
  });
  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return { presignedUrl, fileKey };
}

// ─── updateUserAvatar ─────────────────────────────────────────────────────────

export async function updateUserAvatar(fileKey: string): Promise<Result> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (!fileKey.startsWith(`avatars/${session.user.id}/`))
    return { error: "Invalid file key." };

  const avatarUrl = `${S3_PUBLIC_BASE}/${fileKey}`;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl },
  });

  revalidatePath("/dashboard/profile");
  return {};
}

// ─── getBannerPresignedUrl ────────────────────────────────────────────────────

export async function getBannerPresignedUrl(
  fileType: string,
  fileSize: number,
): Promise<{ presignedUrl: string; fileKey: string } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (!ALLOWED_IMAGE.has(fileType)) return { error: "Only JPEG, PNG or WebP." };
  if (fileSize > 10 * 1024 * 1024)  return { error: "Banner exceeds 10 MB." };

  const ext     = fileType === "image/png" ? "png" : fileType === "image/webp" ? "webp" : "jpg";
  const fileKey = `banners/${session.user.id}/${uuidv4()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket:      S3_BUCKET,
    Key:         fileKey,
    ContentType: fileType,
  });
  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return { presignedUrl, fileKey };
}

// ─── updateUserBanner ─────────────────────────────────────────────────────────

export async function updateUserBanner(fileKey: string): Promise<Result> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (!fileKey.startsWith(`banners/${session.user.id}/`))
    return { error: "Invalid file key." };

  const bannerUrl = `${S3_PUBLIC_BASE}/${fileKey}`;

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { bannerUrl },
  });

  revalidatePath("/dashboard/profile");
  return {};
}
