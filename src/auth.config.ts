import type { Role } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";

/**
 * Edge-sichere Auth-Konfiguration (ohne Prisma / bcrypt).
 * Wird von der Middleware und von `auth.ts` gemeinsam genutzt.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Öffentlich erreichbar (auch ohne Login). Die /login-Seite leitet
      // angemeldete Nutzer selbst weiter (nach Prüfung, dass das Konto existiert).
      if (pathname === "/login" || pathname.startsWith("/invite")) {
        return true;
      }

      // Alle anderen Seiten erfordern Login.
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
