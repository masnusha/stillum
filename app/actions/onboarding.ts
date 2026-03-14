"use server";

import { redirect }       from "next/navigation";
import { getServerSession } from "next-auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl }   from "@aws-sdk/s3-request-presigner";
import { randomUUID }     from "crypto";
import { authOptions }    from "@/auth";
import { prisma }         from "@/lib/prisma";
import { s3, S3_BUCKET, S3_PUBLIC_BASE } from "@/lib/s3";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OnboardingData {
  username:  string;
  bio:       string;
  avatarUrl: string | null;
  bannerUrl: string | null;
}

// ─── getImageUploadUrl ────────────────────────────────────────────────────────
// Returns a short-lived presigned PUT URL for direct S3 upload from the browser.

export async function getImageUploadUrl(
  type:        "avatar" | "banner",
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Only allow image MIME types
  if (!contentType.startsWith("image/")) throw new Error("Invalid MIME type");

  const ext  = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const key  = `profiles/${session.user.id}/${type}-${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket:      S3_BUCKET,
    Key:         key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = `${S3_PUBLIC_BASE}/${key}`;

  return { uploadUrl, publicUrl };
}

// ─── completeOnboarding ───────────────────────────────────────────────────────

const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;

export type OnboardingResult =
  | { field: "username"; error: string }
  | { field: "general";  error: string };

export async function completeOnboarding(
  data: OnboardingData,
): Promise<OnboardingResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { field: "general", error: "Не авторизован" };

  const username = data.username.trim();

  if (!USERNAME_REGEX.test(username)) {
    return { field: "username", error: "Никнейм: 3–30 символов, только буквы, цифры, . и _" };
  }

  // Check uniqueness (case-insensitive)
  const existing = await prisma.user.findFirst({
    where: {
      username: { equals: username, mode: "insensitive" },
      NOT:      { id: session.user.id },
    },
    select: { id: true },
  });

  if (existing) return { field: "username", error: "Этот никнейм уже занят" };

  await prisma.user.update({
    where: { id: session.user.id },
    data:  {
      username,
      bio:       data.bio.trim() || null,
      avatarUrl: data.avatarUrl || null,
      bannerUrl: data.bannerUrl || null,
    },
  });

  redirect("/dashboard/home");
}
