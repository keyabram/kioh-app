import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendMentorApplicationDecisionEmail } from "@/server/actions/emailActions";
import {
  getDb,
  type EcosystemInquiryDocument,
  type MentorApplicationDocument,
  type UserDocument,
  type UserUploadDocument,
  type VerifiedOrganizationDocument,
} from "@/server/lib/mongodb";
import { normalizeMentorSocialUrl } from "@/utils/mentorSocialUrls";

async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin" ? session : null;
}

export async function GET() {
  const session = await isAdmin();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Admin access is required." },
      { status: 403 }
    );
  }

  try {
    const db = await getDb();
    const [applications, partnerInquiries] = await Promise.all([
      db
        .collection<MentorApplicationDocument>("mentorApplications")
        .find({ status: "Under Review" })
        .sort({ createdAt: 1 })
        .toArray(),
      db
        .collection<EcosystemInquiryDocument>("ecosystemInquiries")
        .find({
          role: "partner",
          organization: { $ne: "" },
          $or: [
            { verificationStatus: "Under Review" },
            { verificationStatus: { $exists: false } },
          ],
        })
        .sort({ createdAt: 1 })
        .toArray(),
    ]);

    const uploadKeys = [...new Set(applications.flatMap((app) => app.certificateKeys))];
    const uploads = uploadKeys.length
      ? await db
          .collection<UserUploadDocument>("userUploads")
          .find({
            _id: { $in: uploadKeys },
            category: "certificate",
          })
          .toArray()
      : [];
    const uploadById = new Map(uploads.map((upload) => [upload._id, upload]));

    return NextResponse.json({
      success: true,
      data: {
        mentorApplications: applications.map((application) => ({
          id: application._id,
          fullName: application.fullName,
          email: application.email,
          title: application.title,
          organization: application.organization,
          county: application.county,
          experienceYears: application.experienceYears,
          specialties: application.specialties,
          bio: application.bio,
          linkedinUrl:
            normalizeMentorSocialUrl(application.linkedinUrl, "linkedin") ?? "",
          websiteUrl: application.websiteUrl
            ? normalizeMentorSocialUrl(application.websiteUrl, "website")
            : null,
          githubUrl: application.githubUrl
            ? normalizeMentorSocialUrl(application.githubUrl, "github")
            : null,
          xUrl: application.xUrl
            ? normalizeMentorSocialUrl(application.xUrl, "x")
            : null,
          availableDays: application.availableDays,
          createdAt: application.createdAt,
          certificates: application.certificateKeys.flatMap((key) => {
            const upload = uploadById.get(key);
            return upload && upload.userId === application.userId
              ? [{ key, name: upload.name }]
              : [];
          }),
        })),
        partnerInquiries: partnerInquiries.map((inquiry) => ({
          id: inquiry._id,
          fullName: inquiry.fullName,
          email: inquiry.email,
          organization: inquiry.organization,
          location: inquiry.location,
          interest: inquiry.interest,
          publicOrganizationConsent: inquiry.publicOrganizationConsent === true,
          createdAt: inquiry.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("[ADMIN_VERIFICATION_QUEUE_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load verification requests." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await isAdmin();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Admin access is required." },
      { status: 403 }
    );
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid verification decision." },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;
    const type = input.type;
    const id = typeof input.id === "string" ? input.id : "";
    const decision = input.decision;
    if (
      (type !== "mentor" && type !== "partner") ||
      !id ||
      (decision !== "approve" && decision !== "reject")
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid verification decision." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const reviewedAt = new Date();
    if (type === "mentor") {
      const applications =
        db.collection<MentorApplicationDocument>("mentorApplications");
      const application = await applications.findOne({
        _id: id,
        status: "Under Review",
      });
      if (!application) {
        return NextResponse.json(
          { success: false, message: "This mentor application was already reviewed or could not be found." },
          { status: 404 }
        );
      }

      const userExists = await db
        .collection<UserDocument>("users")
        .findOne({ _id: application.userId }, { projection: { _id: 1 } });
      if (!userExists) {
        return NextResponse.json(
          { success: false, message: "The applicant account could not be found." },
          { status: 409 }
        );
      }

      const result = await applications.updateOne(
        { _id: id, status: "Under Review" },
        {
          $set: {
            status: decision === "approve" ? "Approved" : "Rejected",
            reviewedAt,
            reviewedBy: session.user.id,
          },
        }
      );
      if (result.modifiedCount !== 1) {
        return NextResponse.json(
          { success: false, message: "This mentor application was already reviewed." },
          { status: 409 }
        );
      }

      if (decision === "approve") {
        await db.collection<UserDocument>("users").updateOne(
          { _id: application.userId },
          {
            $set: {
              role: "navigator",
              navigatorVerifiedAt: reviewedAt,
              updatedAt: reviewedAt,
            },
          }
        );
      }

      const emailResult = await sendMentorApplicationDecisionEmail(
        application.fullName,
        application.email,
        decision === "approve" ? "Approved" : "Rejected"
      );
      if (!emailResult.success) {
        console.error(
          "[MENTOR_APPLICATION_DECISION_EMAIL_WARNING]:",
          emailResult.error
        );
      }
    } else {
      const inquiries =
        db.collection<EcosystemInquiryDocument>("ecosystemInquiries");
      const inquiry = await inquiries.findOne({
        _id: id,
        role: "partner",
        organization: { $ne: "" },
        $or: [
          { verificationStatus: "Under Review" },
          { verificationStatus: { $exists: false } },
        ],
      });
      if (!inquiry) {
        return NextResponse.json(
          { success: false, message: "This partner inquiry was already reviewed or could not be found." },
          { status: 404 }
        );
      }

      const result = await inquiries.updateOne(
        {
          _id: id,
          role: "partner",
          ...(inquiry.verificationStatus
            ? { verificationStatus: inquiry.verificationStatus }
            : { verificationStatus: { $exists: false } }),
        },
        {
          $set: {
            verificationStatus: decision === "approve" ? "Approved" : "Rejected",
            reviewedAt,
            reviewedBy: session.user.id,
          },
        }
      );
      if (result.modifiedCount !== 1) {
        return NextResponse.json(
          { success: false, message: "This partner inquiry was already reviewed." },
          { status: 409 }
        );
      }

      const normalizedName = inquiry.organization.trim().replace(/\s+/g, " ").toLowerCase();
      const organizations =
        db.collection<VerifiedOrganizationDocument>("verifiedOrganizations");
      if (decision === "approve") {
        await organizations.updateOne(
          { _id: normalizedName },
          {
            $set: {
              name: inquiry.organization.trim().replace(/\s+/g, " "),
              publicConsent: inquiry.publicOrganizationConsent === true,
              sourceInquiryId: inquiry._id,
              verifiedAt: reviewedAt,
            },
          },
          { upsert: true }
        );
      } else {
        await organizations.deleteOne({
          _id: normalizedName,
          sourceInquiryId: inquiry._id,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_VERIFICATION_DECISION_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Could not save the verification decision." },
      { status: 500 }
    );
  }
}
