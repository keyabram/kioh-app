import type { DefaultSession } from "next-auth";
import type { CareerStage, UserRole } from "@/server/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      location: string | null;
      organization: string | null;
      bio: string | null;
      careerStage: CareerStage | null;
      skills: string[];
      interests: string[];
      experience: string | null;
      goals: string | null;
      supportNeeds: string[];
      navigatorVerified: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    location?: string | null;
    organization?: string | null;
    bio?: string | null;
    careerStage?: CareerStage | null;
    skills?: string[];
    interests?: string[];
    experience?: string | null;
    goals?: string | null;
    supportNeeds?: string[];
    navigatorVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    location?: string | null;
    organization?: string | null;
    bio?: string | null;
    careerStage?: CareerStage | null;
    skills?: string[];
    interests?: string[];
    experience?: string | null;
    goals?: string | null;
    supportNeeds?: string[];
    navigatorVerified?: boolean;
  }
}
