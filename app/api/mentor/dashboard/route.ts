import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getDb,
  type MentorApplicationDocument,
} from "@/server/lib/mongodb";
import { KENYA_COUNTIES } from "@/server/data/opportunities";
import { normalizeMentorSocialUrl } from "@/utils/mentorSocialUrls";

const SPECIALTIES = [
  "AgriTech",
  "FinTech & Web3",
  "Software Architecture",
  "Grant Writing & Funding",
  "Venture Capital & Pitch Decks",
  "CleanTech & Energy",
  "Community Growth & Policy",
  "Product Strategy",
];
const AVAILABLE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toApplicationSummary(application: MentorApplicationDocument) {
  return {
    id: application._id,
    fullName: application.fullName,
    title: application.title,
    organization: application.organization,
    county: application.county,
    experienceYears: application.experienceYears,
    specialties: application.specialties,
    bio: application.bio,
    linkedinUrl: application.linkedinUrl,
    websiteUrl: application.websiteUrl ?? "",
    githubUrl: application.githubUrl ?? "",
    xUrl: application.xUrl ?? "",
    availableDays: application.availableDays,
    publicProfileConsent: application.publicProfileConsent === true,
    status: application.status,
    submittedAt: application.createdAt.toISOString(),
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Sign in to access the mentor workspace." },
      { status: 401 }
    );
  }

  try {
    const application = await (await getDb())
      .collection<MentorApplicationDocument>("mentorApplications")
      .find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();

    return NextResponse.json({
      success: true,
      data: application ? toApplicationSummary(application) : null,
    });
  } catch (error) {
    console.error("[MENTOR_DASHBOARD_GET_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Could not load your mentor workspace." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Sign in to update your mentor profile." },
      { status: 401 }
    );
  }

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json(
        { success: false, message: "Invalid mentor profile details." },
        { status: 400 }
      );
    }

    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const organization =
      typeof body.organization === "string" ? body.organization.trim() : "";
    const county = typeof body.county === "string" ? body.county : "";
    const experienceYears = Number(body.experienceYears);
    const bio = typeof body.bio === "string" ? body.bio.trim() : "";
    const linkedinUrl =
      typeof body.linkedinUrl === "string" ? body.linkedinUrl.trim() : "";
    const websiteUrl =
      typeof body.websiteUrl === "string" ? body.websiteUrl.trim() : "";
    const githubUrl =
      typeof body.githubUrl === "string" ? body.githubUrl.trim() : "";
    const xUrl = typeof body.xUrl === "string" ? body.xUrl.trim() : "";
    const normalizedLinkedInUrl = normalizeMentorSocialUrl(
      linkedinUrl,
      "linkedin"
    );
    const normalizedWebsiteUrl = websiteUrl
      ? normalizeMentorSocialUrl(websiteUrl, "website")
      : null;
    const normalizedGithubUrl = githubUrl
      ? normalizeMentorSocialUrl(githubUrl, "github")
      : null;
    const normalizedXUrl = xUrl ? normalizeMentorSocialUrl(xUrl, "x") : null;
    const specialties = isStringArray(body.specialties) ? body.specialties : [];
    const availableDays = isStringArray(body.availableDays)
      ? body.availableDays
      : [];
    const publicProfileConsent =
      typeof body.publicProfileConsent === "boolean"
        ? body.publicProfileConsent
        : null;
    const invalid =
      fullName.length < 2 ||
      fullName.length > 120 ||
      title.length < 2 ||
      title.length > 120 ||
      organization.length < 2 ||
      organization.length > 160 ||
      !KENYA_COUNTIES.includes(county) ||
      county === "All Counties" ||
      county === "Nationwide" ||
      !Number.isInteger(experienceYears) ||
      experienceYears < 1 ||
      experienceYears > 25 ||
      bio.length < 20 ||
      bio.length > 3000 ||
      !normalizedLinkedInUrl ||
      (websiteUrl && !normalizedWebsiteUrl) ||
      (githubUrl && !normalizedGithubUrl) ||
      (xUrl && !normalizedXUrl) ||
      !isStringArray(body.specialties) ||
      specialties.length === 0 ||
      specialties.some((value) => !SPECIALTIES.includes(value)) ||
      new Set(specialties).size !== specialties.length ||
      !isStringArray(body.availableDays) ||
      availableDays.length === 0 ||
      availableDays.some((value) => !AVAILABLE_DAYS.includes(value)) ||
      new Set(availableDays).size !== availableDays.length ||
      publicProfileConsent === null;

    if (invalid) {
      return NextResponse.json(
        { success: false, message: "Please check the mentor profile fields and try again." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const applications = db.collection<MentorApplicationDocument>("mentorApplications");
    const application = await applications
      .find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();

    if (!application) {
      return NextResponse.json(
        { success: false, message: "Submit a mentor application before editing your profile." },
        { status: 404 }
      );
    }
    if (application.status === "Rejected") {
      return NextResponse.json(
        { success: false, message: "This application was not approved. Submit a new application to continue." },
        { status: 409 }
      );
    }

    await applications.updateOne(
      { _id: application._id, userId: session.user.id, status: application.status },
      {
        $set: {
          fullName,
          title,
          organization,
          county,
          experienceYears,
          bio,
          linkedinUrl: normalizedLinkedInUrl,
          websiteUrl: normalizedWebsiteUrl,
          githubUrl: normalizedGithubUrl,
          xUrl: normalizedXUrl,
          specialties,
          availableDays,
          publicProfileConsent,
        },
      }
    );
    const updated = await applications.findOne({
      _id: application._id,
      userId: session.user.id,
    });

    if (!updated) {
      throw new Error("Updated mentor application could not be reloaded.");
    }

    return NextResponse.json({
      success: true,
      data: toApplicationSummary(updated),
    });
  } catch (error) {
    console.error("[MENTOR_DASHBOARD_UPDATE_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Could not save your mentor profile." },
      { status: 500 }
    );
  }
}
