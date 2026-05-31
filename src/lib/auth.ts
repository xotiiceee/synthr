import { compare, hash } from "bcryptjs";
import { NextAuthOptions, getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          setupComplete: user.setupComplete,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.setupComplete = user.setupComplete;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.setupComplete = token.setupComplete as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    newUser: "/auth/signup",
  },
  session: {
    strategy: "jwt",
  },
};

export async function auth(req?: NextRequest) {
  if (req) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.sub) return null;
    return {
      user: {
        id: token.sub as string,
        name: token.name as string,
        email: token.email as string,
        setupComplete: token.setupComplete as boolean,
      },
    };
  }
  return getServerSession(authOptions);
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}
