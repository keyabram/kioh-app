import { getDb, type MentorApplicationDocument, type UserDocument } from "@/server/lib/mongodb";
import { SAMPLE_MENTORS } from "@/server/data/mentors";
import type { Mentor } from "@/server/types/mentor";
import { normalizeMentorSocialUrl } from "@/utils/mentorSocialUrls";

export async function fetchAllMentors(): Promise<Mentor[]> {
  try {
    const db = await getDb();
    const applications = await db
      .collection<MentorApplicationDocument>("mentorApplications")
      .find({ status: "Approved", publicProfileConsent: true })
      .sort({ reviewedAt: -1 })
      .toArray();
    if (applications.length === 0) {
      return SAMPLE_MENTORS.map((mentor) => ({ ...mentor, isBookable: false }));
    }

    const users = await db
      .collection<UserDocument>("users")
      .find({ _id: { $in: applications.map((application) => application.userId) } })
      .project<{ _id: string; image: string | null }>({ _id: 1, image: 1 })
      .toArray();
    const imageByUserId = new Map(users.map((user) => [user._id, user.image]));

    return applications.map((application) => {
      const websiteUrl = application.websiteUrl
        ? normalizeMentorSocialUrl(application.websiteUrl, "website")
        : null;
      const githubUrl = application.githubUrl
        ? normalizeMentorSocialUrl(application.githubUrl, "github")
        : null;
      const xUrl = application.xUrl
        ? normalizeMentorSocialUrl(application.xUrl, "x")
        : null;

      return {
        id: application._id,
        name: application.fullName,
        title: application.title,
        organization: application.organization,
        avatar:
          imageByUserId.get(application.userId) ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(application.fullName)}`,
        county: application.county,
        specialties: application.specialties,
        bio: application.bio,
        linkedinUrl:
          normalizeMentorSocialUrl(application.linkedinUrl, "linkedin") ?? "",
        ...(websiteUrl ? { websiteUrl } : {}),
        ...(githubUrl ? { githubUrl } : {}),
        ...(xUrl ? { xUrl } : {}),
        experienceYears: application.experienceYears,
        availableDays: application.availableDays,
        sessionDuration: "30 mins",
        rating: 0,
        sessionsCompleted: 0,
        isVerified: true,
        isBookable: true,
      };
    });
  } catch (error) {
    console.error("[MENTORS_FALLBACK]:", error);
    return SAMPLE_MENTORS.map((mentor) => ({ ...mentor, isBookable: false }));
  }
}