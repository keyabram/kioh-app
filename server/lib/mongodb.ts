import { Db, Document, MongoClient } from "mongodb";
import type { CareerStage, UserRole } from "@/server/types";
import type { Opportunity, OpportunityCategory } from "@/server/types/opportunity";
import type { Mentor } from "@/server/types/mentor";
import type {
  VentureDomain,
  VentureReviewStatus,
  VentureStage,
} from "@/server/types/venture";

export interface UserDocument extends Document {
  _id: string;
  name: string;
  email: string;
  image: string | null;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
  role: UserRole;
  location: string | null;
  organization: string | null;
  bio: string | null;
  careerStage?: CareerStage | null;
  skills?: string[];
  interests?: string[];
  experience?: string | null;
  goals?: string | null;
  supportNeeds?: string[];
  navigatorVerifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailVerificationTokenDocument extends Document {
  _id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt?: Date;
}

export interface PasswordResetTokenDocument extends Document {
  _id: string;
  token: string;
  userId: string;
  expiresAt: Date;
}

export interface OpportunityDocument extends Document, Omit<Opportunity, "id"> {
  _id: string;
  category: Exclude<OpportunityCategory, "All">;
  applicationUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationDocument extends Document {
  _id: string;
  userId: string;
  opportunityId: string;
  pitchDeckKey: string | null;
  certificateKeys?: string[];
  appliedAt: Date;
  status: "Under Review" | "Shortlisted" | "Accepted" | "Rejected";
  statusUpdatedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface SavedOpportunityDocument extends Document {
  _id: string;
  userId: string;
  opportunityId: string;
  savedAt: Date;
}

export interface UserUploadDocument extends Document {
  _id: string;
  userId: string;
  name: string;
  size: number;
  type: string;
  category: "pitchDeck" | "certificate";
  uploadedAt: Date;
}

export interface MentorApplicationDocument extends Document {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  title: string;
  organization: string;
  county: string;
  experienceYears: number;
  specialties: string[];
  bio: string;
  linkedinUrl: string;
  websiteUrl?: string | null;
  githubUrl?: string | null;
  xUrl?: string | null;
  availableDays: string[];
  certificateKeys: string[];
  publicProfileConsent?: boolean;
  status: "Under Review" | "Approved" | "Rejected";
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface MentorSessionDocument extends Document {
  _id: string;
  mentorApplicationId: string;
  mentorUserId: string;
  menteeUserId: string;
  menteeName: string;
  mentor: Mentor;
  day: string;
  timeSlot: string;
  topic: string;
  scheduledAt: Date;
  status: "Upcoming" | "Completed" | "Cancelled";
  createdAt: Date;
  updatedAt: Date;
}

export interface EcosystemInquiryDocument extends Document {
  _id: string;
  fullName: string;
  email: string;
  organization: string;
  location: string;
  interest: string;
  role: "builder" | "mentor" | "donor" | "partner";
  createdAt: Date;
  publicOrganizationConsent?: boolean;
  verificationStatus?: "Under Review" | "Approved" | "Rejected";
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface VerifiedOrganizationDocument extends Document {
  _id: string;
  name: string;
  publicConsent: boolean;
  sourceInquiryId: string;
  verifiedAt: Date;
}

export interface VentureDocument extends Document {
  _id: string;
  ownerId: string;
  name: string;
  tagline: string;
  description: string;
  domain: VentureDomain;
  county: string;
  stage: VentureStage;
  websiteUrl: string | null;
  publicEmail: string;
  linkedinUrl: string | null;
  founderName: string;
  founderOrganization: string | null;
  reviewStatus: VentureReviewStatus;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
  mongoDbPromise?: Promise<Db>;
};

function getMongoClientPromise() {
  if (!globalForMongo.mongoClientPromise) {
    const uri =
      process.env.MONGODB_URI ??
      (process.env.NODE_ENV === "production"
        ? undefined
        : "mongodb://127.0.0.1:27017/kioh");

    if (!uri) {
      throw new Error("MONGODB_URI must be configured in production.");
    }

    const client = new MongoClient(uri);
    globalForMongo.mongoClientPromise = client.connect();
  }

  return globalForMongo.mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  if (!globalForMongo.mongoDbPromise) {
    globalForMongo.mongoDbPromise = (async () => {
      const client = await getMongoClientPromise();
      const db = client.db(process.env.MONGODB_DB || undefined);

      await Promise.all([
        db.collection("users").createIndex(
          { email: 1 },
          { unique: true, sparse: true }
        ),
        db.collection("users").createIndex({ createdAt: 1 }),
        db
          .collection("emailVerificationTokens")
          .createIndex({ token: 1 }, { unique: true }),
        db
          .collection("emailVerificationTokens")
          .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db
          .collection("passwordResetTokens")
          .createIndex({ token: 1 }, { unique: true }),
        db
          .collection("passwordResetTokens")
          .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection("applications").createIndex(
          { userId: 1, opportunityId: 1 },
          { unique: true }
        ),
        db.collection("applications").createIndex({ userId: 1, appliedAt: -1 }),
        db.collection("applications").createIndex({ appliedAt: 1 }),
        db.collection("applications").createIndex({ status: 1, appliedAt: 1 }),
        db.collection<SavedOpportunityDocument>("savedOpportunities").createIndex(
          { userId: 1, opportunityId: 1 },
          { unique: true }
        ),
        db.collection<SavedOpportunityDocument>("savedOpportunities").createIndex(
          { userId: 1, savedAt: -1 }
        ),
        db.collection("userUploads").createIndex(
          { userId: 1, category: 1, _id: 1 },
          { unique: true }
        ),
        db.collection("mentorApplications").createIndex(
          { userId: 1, createdAt: -1 }
        ),
        db.collection<MentorSessionDocument>("mentorSessions").createIndex(
          { menteeUserId: 1, scheduledAt: -1 }
        ),
        db.collection<MentorSessionDocument>("mentorSessions").createIndex(
          { mentorUserId: 1, scheduledAt: 1 },
          { unique: true }
        ),
        db.collection("ecosystemInquiries").createIndex({ createdAt: -1 }),
        db.collection<VerifiedOrganizationDocument>("verifiedOrganizations")
          .createIndex({ publicConsent: 1, name: 1 }),
        db.collection<VentureDocument>("ventures").createIndex(
          { ownerId: 1, createdAt: -1 }
        ),
        db.collection<VentureDocument>("ventures").createIndex(
          { reviewStatus: 1, createdAt: -1 }
        ),
        db.collection<VentureDocument>("ventures").createIndex({
          createdAt: 1,
        }),
        db.collection<VentureDocument>("ventures").createIndex(
          { reviewStatus: 1, county: 1, domain: 1, createdAt: -1 }
        ),
      ]);

      return db;
    })();
  }

  return globalForMongo.mongoDbPromise;
}
