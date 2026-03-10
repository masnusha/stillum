// Augment Auth.js session types so session.user.id is available everywhere
// without casting. This is the official Auth.js v5 pattern.
// https://authjs.dev/getting-started/typescript

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
