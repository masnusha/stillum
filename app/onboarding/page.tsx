import { redirect }         from "next/navigation";
import { getServerSession }  from "next-auth";
import { authOptions }       from "@/auth";
import { prisma }            from "@/lib/prisma";
import OnboardingFlow        from "./_components/OnboardingFlow";

export const dynamic = "force-dynamic";

// No layout wrapping — onboarding is a full-screen standalone experience.

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  // Not logged in → go to login
  if (!session?.user?.id) redirect("/login");

  // Already has a username → onboarding done, skip to dashboard
  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { username: true },
  });

  if (user?.username) redirect("/dashboard/home");

  return <OnboardingFlow />;
}
