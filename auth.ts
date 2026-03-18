import NextAuth, { type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider, {
  type SendVerificationRequestParams,
} from "next-auth/providers/email";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

async function sendVerificationRequest({
  identifier,
  url,
  provider,
}: SendVerificationRequestParams) {
  // ─── Dev: print the magic link to the terminal, skip SMTP ────────────────
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `\n🪄 MAGIC LINK ДЛЯ ${identifier}:\n   ${url}\n`
    );
    return;
  }

  // ─── Production: send via configured SMTP ────────────────────────────────
  const transport = nodemailer.createTransport(provider.server);
  await transport.sendMail({
    to: identifier,
    from: provider.from,
    subject: "Sign in to Stillum",
    text: `Sign in to Stillum\n\n${url}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#030712;color:#fff;border-radius:16px">
        <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#ffffff33;margin:0 0 24px">Stillum</p>
        <h1 style="font-size:20px;font-weight:600;margin:0 0 12px">Sign in to your cloud</h1>
        <p style="font-size:14px;color:#ffffff66;margin:0 0 28px">Click the button below. The link expires in 24 hours.</p>
        <a href="${url}" style="display:inline-block;padding:12px 28px;background:#ffffff12;border:1px solid #ffffff14;border-radius:14px;color:#fff;font-size:14px;font-weight:500;text-decoration:none">
          Sign in to Stillum
        </a>
        <p style="font-size:12px;color:#ffffff30;margin:32px 0 0">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER ?? "smtp://localhost:25",
      from: process.env.EMAIL_FROM ?? "Stillum <noreply@stillum.app>",
      sendVerificationRequest,
    }),
  ],

  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login",
  },

  session: {
    // Database-backed sessions per AUTH_ARCHITECTURE.md §3.
    // Session tokens are stored in the DB — supports immediate revocation.
    strategy: "database",
  },

  callbacks: {
    // Expose user.id and custom profile fields so clients stay in sync.
    // With database strategy, PrismaAdapter passes the full DB User object here —
    // including our custom avatarUrl and username fields.
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Cast to access custom fields returned by PrismaAdapter at runtime.
        const u = user as typeof user & {
          avatarUrl?:   string | null;
          username?:    string | null;
          plan?:        string;
          role?:        string;
          statusEmoji?: string | null;
        };
        // Prefer custom avatar over the OAuth provider image.
        if (u.avatarUrl) session.user.image = u.avatarUrl;
        // Prefer custom username over the OAuth display name.
        if (u.username)  session.user.name  = u.username;
        // Subscription & role fields.
        session.user.plan        = u.plan        ?? "FREE";
        session.user.role        = u.role        ?? "USER";
        session.user.statusEmoji = u.statusEmoji ?? null;
      }
      return session;
    },

    // After sign-in, always land on /dashboard (never loop back to /login).
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) {
        const path = url.slice(baseUrl.length) || "/";
        if (path === "/" || path.startsWith("/login")) return `${baseUrl}/dashboard`;
        return url;
      }
      return `${baseUrl}/dashboard`;
    },

    // Block suspended users at sign-in (AUTH_ARCHITECTURE.md §4).
    // Also handles OAuth account linking for users created via magic link.
    async signIn({ user, account }) {
      if (!user.email) return false;

      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, isSuspended: true },
      });

      if (dbUser?.isSuspended) return false;

      // If signing in via OAuth and a matching user exists without this OAuth
      // account linked, link it now (fixes OAuthAccountNotLinked for magic-link users).
      if (account && account.type === "oauth" && dbUser) {
        const existing = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        });

        if (!existing) {
          await prisma.account.create({
            data: {
              userId:            dbUser.id,
              type:              account.type,
              provider:          account.provider,
              providerAccountId: account.providerAccountId,
              access_token:      account.access_token  ?? null,
              refresh_token:     account.refresh_token ?? null,
              expires_at:        account.expires_at    ?? null,
              token_type:        account.token_type    ?? null,
              scope:             account.scope         ?? null,
              id_token:          account.id_token      ?? null,
              session_state:     account.session_state ?? null,
            },
          });
          // Update user.id so next-auth uses the existing user's id for the session
          user.id = dbUser.id;
        }
      }

      return true;
    },
  },
};

export default NextAuth(authOptions);
