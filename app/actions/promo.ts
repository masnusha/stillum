"use server";

import { getServerSession } from "next-auth";
import { authOptions }      from "@/auth";
import { prisma }           from "@/lib/prisma";

type RedeemResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "already_used" | "unauthenticated" };

export async function redeemPromoCode(rawCode: string): Promise<RedeemResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, reason: "unauthenticated" };

  const userId = session.user.id;
  const code   = rawCode.trim().toUpperCase();

  const promo = await prisma.promoCode.findUnique({ where: { code } });

  if (!promo || !promo.isActive)    return { ok: false, reason: "not_found"    };
  if (promo.usedById !== null)      return { ok: false, reason: "already_used" };

  // Atomic: mark code used + upgrade user plan in one transaction
  await prisma.$transaction([
    prisma.promoCode.update({
      where: { id: promo.id },
      data:  { usedById: userId, usedAt: new Date(), isActive: false },
    }),
    prisma.user.update({
      where: { id: userId },
      data:  { plan: "PLUS", planSince: new Date() },
    }),
  ]);

  return { ok: true };
}
