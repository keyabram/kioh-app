// server/types/index.ts

export interface Opportunity {
  id: string;
  type: string;
  category: string;
  title: string;
  organization: string;
  deadline: string;
  location: string;
  stipend?: string;
  description: string;
  eligibility: string[];
  tags: string[];
}

export interface Mentor {
  id: string;
  name: string;
  role: string;
  company: string;
  domain: string;
  bio: string;
  skills: string[];
  available: boolean;
}

export interface StakeholderPartner {
  id: string;
  title: string;
  badge: string;
  icon: string;
  tagline: string;
  description: string;
  benefits: string[];
  cta: string;
  roleType: "builder" | "mentor" | "donor" | "partner";
}

export interface RoadmapMilestone {
  phase: string;
  title: string;
  year: string;
  summary: string;
  details: string[];
}
export type UserRole = "participant" | "navigator" | "mentor" | "funder" | "admin";
export type CareerStage = "student" | "graduate" | "other";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatar: string;
  role: UserRole;
  isEmailVerified: boolean;
  bio?: string;
  location?: string;
  skills?: string[];
  interests?: string[];
  careerStage?: CareerStage;
  experience?: string;
  goals?: string;
  supportNeeds?: string[];
  organization?: string;
  navigatorVerified?: boolean;
  createdAt: Date;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: UserProfile;
  token?: string;
}