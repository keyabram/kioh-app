import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { getDb, type UserDocument } from "@/server/lib/mongodb";
import type { UserRole } from "@/server/types";

function isUserRole(value: unknown): value is UserRole {
  return (
    value === "participant" ||
    value === "navigator" ||
    value === "mentor" ||
    value === "funder" ||
    value === "admin"
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials.password === "string"
            ? credentials.password
            : "";

        if (!email || !password) return null;

        const db = await getDb();
        const user = await db.collection<UserDocument>("users").findOne({ email });
        if (!user?.passwordHash || !user.emailVerifiedAt) return null;
        if (!(await bcrypt.compare(password, user.passwordHash))) return null;

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          location: user.location,
          organization: user.organization,
          bio: user.bio,
          careerStage: user.careerStage,
          skills: user.skills || [],
          interests: user.interests || [],
          experience: user.experience,
          goals: user.goals,
          supportNeeds: user.supportNeeds || [],
          navigatorVerified: Boolean(user.navigatorVerifiedAt),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.email && account?.provider === "google") {
        const db = await getDb();
        const email = user.email.trim().toLowerCase();
        await db.collection<UserDocument>("users").updateOne(
          { email },
          {
            $setOnInsert: {
              _id: randomUUID(),
              name: user.name || "User",
              email,
              image: user.image || null,
              passwordHash: null,
              emailVerifiedAt: new Date(),
              role: "participant",
              location: null,
              organization: null,
              bio: null,
              careerStage: null,
              skills: [],
              interests: [],
              experience: null,
              goals: null,
              supportNeeds: [],
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
        const storedUser = await db
          .collection<UserDocument>("users")
          .findOne({ email });
        if (storedUser) {
          token.sub = storedUser._id;
          token.role = storedUser.role;
          token.location = storedUser.location;
          token.organization = storedUser.organization;
          token.bio = storedUser.bio;
          token.careerStage = storedUser.careerStage;
          token.skills = storedUser.skills || [];
          token.interests = storedUser.interests || [];
          token.experience = storedUser.experience;
          token.goals = storedUser.goals;
          token.supportNeeds = storedUser.supportNeeds || [];
          token.navigatorVerified = Boolean(storedUser.navigatorVerifiedAt);
        }
      } else if (user) {
        token.sub = user.id;
        token.role = user.role ?? "participant";
        token.location = user.location ?? null;
        token.organization = user.organization ?? null;
        token.bio = user.bio ?? null;
        token.careerStage = user.careerStage ?? null;
        token.skills = user.skills ?? [];
        token.interests = user.interests ?? [];
        token.experience = user.experience ?? null;
        token.goals = user.goals ?? null;
        token.supportNeeds = user.supportNeeds ?? [];
        token.navigatorVerified = Boolean(user.navigatorVerified);
      } else if (token.sub) {
        const db = await getDb();
        const storedUser = await db
          .collection<UserDocument>("users")
          .findOne({ _id: token.sub });
        if (storedUser) {
          token.role = storedUser.role;
          token.location = storedUser.location;
          token.organization = storedUser.organization;
          token.bio = storedUser.bio;
          token.careerStage = storedUser.careerStage;
          token.skills = storedUser.skills || [];
          token.interests = storedUser.interests || [];
          token.experience = storedUser.experience;
          token.goals = storedUser.goals;
          token.supportNeeds = storedUser.supportNeeds || [];
          token.navigatorVerified = Boolean(storedUser.navigatorVerifiedAt);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.role = isUserRole(token.role) ? token.role : "participant";
        session.user.location =
          typeof token.location === "string" ? token.location : null;
        session.user.organization =
          typeof token.organization === "string" ? token.organization : null;
        session.user.bio = typeof token.bio === "string" ? token.bio : null;
        session.user.careerStage =
          token.careerStage === "student" ||
          token.careerStage === "graduate" ||
          token.careerStage === "other"
            ? token.careerStage
            : null;
        session.user.skills = Array.isArray(token.skills) ? token.skills : [];
        session.user.interests = Array.isArray(token.interests)
          ? token.interests
          : [];
        session.user.experience =
          typeof token.experience === "string" ? token.experience : null;
        session.user.goals =
          typeof token.goals === "string" ? token.goals : null;
        session.user.supportNeeds = Array.isArray(token.supportNeeds)
          ? token.supportNeeds
          : [];
        session.user.navigatorVerified = token.navigatorVerified === true;
      }
      return session;
    },
  },
});
