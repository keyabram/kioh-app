export interface Mentor {
  id: string;
  name: string;
  title: string;
  organization: string;
  avatar: string;
  county: string;
  specialties: string[];
  bio: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  githubUrl?: string;
  xUrl?: string;
  experienceYears: number;
  availableDays: string[];
  sessionDuration: string; // e.g. "30 mins" or "45 mins"
  rating: number;
  sessionsCompleted: number;
  isVerified?: boolean;
  isBookable?: boolean;
}