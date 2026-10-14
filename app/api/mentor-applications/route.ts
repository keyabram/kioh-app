import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendMentorApplicationEmail } from "@/server/actions/emailActions";
import {
  getDb,
  type MentorApplicationDocument,
  type UserDocument,
  type UserUploadDocument,
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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Sign in to view your mentor application." },
      { status: 401 }
    );
  }

  try {
    const db = await getDb();
    const application = await db
      .collection<MentorApplicationDocument>("mentorApplications")
      .find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(1)
      .project<{
        status: MentorApplicationDocument["status"];
        createdAt: Date;
        reviewedAt?: Date;
      }>({
        status: 1,
        createdAt: 1,
        reviewedAt: 1,
        _id: 0,
      })
      .next();

    return NextResponse.json({
      success: true,
      data: application
        ? {
            status: application.status,
            submittedAt: application.createdAt.toISOString().slice(0, 10),
            statusUpdatedAt: (
              application.reviewedAt ?? application.createdAt
            ).toISOString(),
          }
        : null,
    });
  } catch (error) {
    console.error("[MENTOR_APPLICATION_GET_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load your mentor application." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Sign in with a verified account to submit your application." },
      { status: 401 }
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Application data must be valid JSON." },
        { status: 400 }
      );
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Invalid mentor application details." },
        { status: 400 }
      );
    }
    const input = body as Record<string, unknown>;
    const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
    const title = typeof input.title === "string" ? input.title.trim() : "";
    const organization =
      typeof input.organization === "string" ? input.organization.trim() : "";
    const county = typeof input.county === "string" ? input.county : "";
    const experienceYears = Number(input.experienceYears);
    const bio = typeof input.bio === "string" ? input.bio.trim() : "";
    const linkedinUrl =
      typeof input.linkedinUrl === "string" ? input.linkedinUrl.trim() : "";
    const websiteUrl =
      typeof input.websiteUrl === "string" ? input.websiteUrl.trim() : "";
    const githubUrl =
      typeof input.githubUrl === "string" ? input.githubUrl.trim() : "";
    const xUrl = typeof input.xUrl === "string" ? input.xUrl.trim() : "";
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
    const specialties: string[] = Array.isArray(input.specialties)
      ? input.specialties.filter(
          (value: unknown): value is string => typeof value === "string"
        )
      : [];
    const availableDays: string[] = Array.isArray(input.availableDays)
      ? input.availableDays.filter(
          (value: unknown): value is string => typeof value === "string"
        )
      : [];
    const certificateKeys = Array.isArray(input.certificateKeys)
      ? input.certificateKeys.filter(
          (value: unknown): value is string => typeof value === "string"
        )
      : [];

    const invalidFields: string[] = [];
    if (fullName.length < 2 || fullName.length > 120) invalidFields.push("full name");
    if (title.length < 2 || title.length > 120) invalidFields.push("professional title");
    if (organization.length < 2 || organization.length > 160) {
      invalidFields.push("organization");
    }
    if (
      !KENYA_COUNTIES.includes(county) ||
      county === "All Counties" ||
      county === "Nationwide"
    ) {
      invalidFields.push("county");
    }
    if (
      !Number.isInteger(experienceYears) ||
      experienceYears < 1 ||
      experienceYears > 25
    ) {
      invalidFields.push("years of experience");
    }
    if (bio.length < 20 || bio.length > 3000) invalidFields.push("bio");
    if (websiteUrl && !normalizedWebsiteUrl) {
      invalidFields.push("website URL");
    }
    if (githubUrl && !normalizedGithubUrl) {
      invalidFields.push("GitHub URL");
    }
    if (xUrl && !normalizedXUrl) {
      invalidFields.push("X or Twitter URL");
    }
    if (
      specialties.length === 0 ||
      specialties.some((specialty) => !SPECIALTIES.includes(specialty)) ||
      new Set(specialties).size !== specialties.length ||
      (input.specialties != null &&
        (!Array.isArray(input.specialties) ||
          input.specialties.some(
            (value: unknown) => typeof value !== "string"
          )))
    ) {
      invalidFields.push("mentorship domains");
    }
    if (
      availableDays.length === 0 ||
      availableDays.some((day) => !AVAILABLE_DAYS.includes(day)) ||
      new Set(availableDays).size !== availableDays.length ||
      (input.availableDays != null &&
        (!Array.isArray(input.availableDays) ||
          input.availableDays.some(
            (value: unknown) => typeof value !== "string"
          )))
    ) {
      invalidFields.push("availability days");
    }
    if (
      certificateKeys.length > 3 ||
      (input.certificateKeys != null &&
        (!Array.isArray(input.certificateKeys) ||
          input.certificateKeys.some(
            (value: unknown) => typeof value !== "string"
          ))) ||
      new Set(certificateKeys).size !== certificateKeys.length
    ) {
      invalidFields.push("certificate uploads");
    }

    if (!normalizedLinkedInUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid LinkedIn profile URL.",
          invalidFields: ["LinkedIn profile URL"],
        },
        { status: 400 }
      );
    }
    if (invalidFields.length > 0) {
      return NextResponse.json(
        {
          message: `Please check the following: ${invalidFields.join(", ")}.`,
          invalidFields,
        },
        { status: 400 }
      );
    }

    const db = await getDb();
    const user = await db.collection<UserDocument>("users").findOne({
      _id: session.user.id,
    });
    if (!user) {
      return NextResponse.json(
        { message: "Your account could not be found. Please sign in again." },
        { status: 401 }
      );
    }

    const existingApplication = await db
      .collection<MentorApplicationDocument>("mentorApplications")
      .findOne({
        userId: user._id,
        status: { $in: ["Under Review", "Approved"] },
      });
    if (existingApplication) {
      return NextResponse.json(
        {
          message:
            existingApplication.status === "Approved"
              ? "Your Navigator application has already been approved."
              : "You already have a Navigator application under review.",
        },
        { status: 409 }
      );
    }

    const certificates = certificateKeys.length
      ? await db
          .collection<UserUploadDocument>("userUploads")
          .find({
            _id: { $in: certificateKeys },
            userId: user._id,
            category: "certificate",
          })
          .toArray()
      : [];
    if (certificates.length !== certificateKeys.length) {
      return NextResponse.json(
        { message: "One or more certificate uploads are invalid." },
        { status: 400 }
      );
    }

    const application: MentorApplicationDocument = {
      _id: randomUUID(),
      userId: user._id,
      fullName,
      email: user.email,
      title,
      organization,
      county,
      experienceYears,
      specialties,
      bio,
      linkedinUrl: normalizedLinkedInUrl,
      ...(normalizedWebsiteUrl ? { websiteUrl: normalizedWebsiteUrl } : {}),
      ...(normalizedGithubUrl ? { githubUrl: normalizedGithubUrl } : {}),
      ...(normalizedXUrl ? { xUrl: normalizedXUrl } : {}),
      availableDays,
      certificateKeys,
      publicProfileConsent: input.publicProfileConsent === true,
      status: "Under Review",
      createdAt: new Date(),
    };
    await db
      .collection<MentorApplicationDocument>("mentorApplications")
      .insertOne(application);

    const emailResult = await sendMentorApplicationEmail(
      fullName,
      user.email,
      specialties,
      county
    );
    if (!emailResult.success) {
      console.error("[MENTOR_APPLICATION_EMAIL_WARNING]:", emailResult.error);
    }

    return NextResponse.json(
      {
        success: true,
        emailSent: emailResult.success,
        message: "Your mentor application has been received.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[MENTOR_APPLICATION_CREATE_ERROR]:", error);
    return NextResponse.json(
      { message: "Failed to submit your application. Please try again." },
      { status: 500 }
    );
  }
}
