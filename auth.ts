import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────
// Auth.js v5 Configuration
//
// Session strategy: JWT
// Reason: CredentialsProvider is incompatible with the "database"
// session strategy in Auth.js v5. JWT allows both Google OAuth
// and Email/Password to coexist cleanly. The PrismaAdapter still
// handles OAuth account linking and user creation.
// ─────────────────────────────────────────

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: { strategy: "jwt" },

  providers: [
    // ── Google OAuth ─────────────────────────
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),

    // ── Email + Password (Credentials) ───────
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        // Never expose why auth failed — same error for "no user" and "wrong password"
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            password: true,
          },
        });

        if (!user?.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    // Persist user.id into the JWT on sign-in
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },

    // Forward user.id from JWT to the client-visible session
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
