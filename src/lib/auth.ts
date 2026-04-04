import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        // 1. Try Provider table first
        const provider = await prisma.provider.findUnique({
          where: { email },
        });
        if (provider && provider.password) {
          const valid = await bcrypt.compare(password, provider.password);
          if (valid) {
            return {
              id: provider.id,
              email: provider.email,
              name: provider.name,
              role: provider.role as "admin" | "provider",
              providerId: provider.id,
            };
          }
        }

        // 2. Fall back to TeamMember table
        const member = await prisma.teamMember.findUnique({
          where: { email },
        });
        if (!member) return null;

        const valid = await bcrypt.compare(password, member.password);
        if (!valid) return null;

        return { id: member.id, email: member.email, name: member.name, role: "admin" };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.providerId = user.providerId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as "admin" | "provider") || "admin";
        session.user.providerId = token.providerId as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
