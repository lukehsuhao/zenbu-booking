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

        const member = await prisma.teamMember.findUnique({
          where: { email: credentials.email as string },
        });
        if (!member) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          member.password
        );
        if (!valid) return null;

        return { id: member.id, email: member.email, name: member.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
});
