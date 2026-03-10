// Augment Auth.js types so session.user.id is typed everywhere
// without manual casting. Required pattern for Auth.js v5 + JWT strategy.
// https://authjs.dev/getting-started/typescript

import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
  }
}
