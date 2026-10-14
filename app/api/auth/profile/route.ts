import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb, type UserDocument } from "@/server/lib/mongodb";
import type { CareerStage, UserRole } from "@/server/types";

const USER_ROLES: UserRole[] = [
  "participant",
  "navigator",
  "mentor",
  "funder",
];
const CAREER_STAGES: CareerStage[] = ["student", "graduate", "other"];

function parseTextList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 30) return null;
  if (
    !value.every(
      (entry) => typeof entry === "string" && entry.trim().length <= 100
    )
  ) {
    return null;
  }
  return [...new Set(value.map((entry: string) => entry.trim()).filter(Boolean))];
}

function toUserProfile(user: UserDocument) {
  return {
    id: user._id,
    fullName: user.name,
    email: user.email,
    avatar: user.image || "",
    role: user.role,
    isEmailVerified: Boolean(user.emailVerifiedAt),
    location: user.location || "",
    organization: user.organization || "",
    bio: user.bio || "",
    careerStage: user.careerStage || "other",
    skills: user.skills || [],
    interests: user.interests || [],
    experience: user.experience || "",
    goals: user.goals || "",
    supportNeeds: user.supportNeeds || [],
    createdAt: user.createdAt,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Sign in to view your profile." },
      { status: 401 }
    );
  }

  try {
    const db = await getDb();
    const user = await db.collection<UserDocument>("users").findOne({
      _id: session.user.id,
    });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User profile not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user: toUserProfile(user) });
  } catch (error) {
    console.error("[PROFILE_GET_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load profile." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Sign in to update your profile." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    if (
      typeof body.role !== "string" ||
      !USER_ROLES.includes(body.role as UserRole) ||
      typeof body.location !== "string" ||
      typeof body.organization !== "string" ||
      typeof body.bio !== "string" ||
      !CAREER_STAGES.includes(body.careerStage as CareerStage) ||
      typeof body.experience !== "string" ||
      body.experience.length > 2000 ||
      typeof body.goals !== "string" ||
      body.goals.length > 2000
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid profile data." },
        { status: 400 }
      );
    }

    const skills = parseTextList(body.skills);
    const interests = parseTextList(body.interests);
    const supportNeeds = parseTextList(body.supportNeeds);
    if (!skills || !interests || !supportNeeds) {
      return NextResponse.json(
        { success: false, message: "Invalid profile lists." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.collection<UserDocument>("users").findOneAndUpdate(
      { _id: session.user.id },
      {
        $set: {
          role: body.role,
          location: body.location.trim(),
          organization: body.organization.trim(),
          bio: body.bio.trim(),
          careerStage: body.careerStage,
          skills,
          interests,
          experience: body.experience.trim(),
          goals: body.goals.trim(),
          supportNeeds,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, message: "User profile not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      user: toUserProfile(result),
    });
  } catch (error) {
    console.error("[PROFILE_UPDATE_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update profile." },
      { status: 500 }
    );
  }
}
