import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import type { OAuthConfig } from "next-auth/providers";
import type { TokenSet } from "@auth/core/types";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────
// VK OAuth 2.0 – Custom Provider
// VK does NOT have a built-in Auth.js provider.
// Docs: https://vk.com/dev/authcode_flow_user
//
// Note on email: VK returns the user's email in the access_token
// response body (not in userinfo). We fetch it via the userinfo
// request using the access_token query param, which VK supports.
// ─────────────────────────────────────────

interface VKProfile {
  id: number;
  first_name: string;
  last_name: string;
  photo_200?: string;
  // email is returned in token body by VK, passed via tokens object
  email?: string;
}

const VK: OAuthConfig<VKProfile> = {
  id: "vk",
  name: "ВКонтакте",
  type: "oauth",
  authorization: {
    url: "https://oauth.vk.com/authorize",
    params: {
      scope: "email",
      display: "popup",
      v: "5.131",
    },
  },
  token: "https://oauth.vk.com/access_token",
  userinfo: {
    url: "https://api.vk.com/method/users.get",
    async request({ tokens, provider }: { tokens: TokenSet; provider: OAuthConfig<VKProfile> }) {
      const url = new URL(provider.userinfo?.url as string);
      url.searchParams.set("fields", "photo_200");
      url.searchParams.set("v", "5.131");
      url.searchParams.set("access_token", tokens.access_token as string);

      const res = await fetch(url.toString());
      const data = (await res.json()) as { response: VKProfile[] };
      const user = data.response[0];

      // VK returns email in the token body; Auth.js stores it in tokens
      return {
        ...user,
        email: (tokens.email as string | undefined) ?? null,
      };
    },
  },
  profile(profile) {
    return {
      id: profile.id.toString(),
      name: `${profile.first_name} ${profile.last_name}`.trim(),
      // email may be null if the user denied permission — Auth.js handles nullable email
      email: profile.email ?? null,
      image: profile.photo_200 ?? null,
    };
  },
  clientId: process.env.VK_CLIENT_ID,
  clientSecret: process.env.VK_CLIENT_SECRET,
  style: {
    brandColor: "#0077FF",
  },
};

// ─────────────────────────────────────────
// Auth.js v5 Config
// ─────────────────────────────────────────

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google, VK],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // Expose user.id on the client session.
    // Without this override, session.user.id is undefined in client components.
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  // Sessions are stored in the DB via PrismaAdapter (strategy: "database")
});
