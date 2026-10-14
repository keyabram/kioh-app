import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getDb,
  type MentorApplicationDocument,
  type MentorSessionDocument,
  type UserDocument,
} from "@/server/lib/mongodb";
import type { Mentor } from "@/server/types/mentor";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIME_SLOTS = ["10:00 AM", "02:00 PM", "04:30 PM"];

function toNairobiScheduledAt(day: string, timeSlot: string): Date | null {
  const timeMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(timeSlot);
  const targetWeekday = WEEKDAYS.indexOf(day);
  if (targetWeekday < 0 || !timeMatch) return null;

  const [, hourText, minuteText, meridiem] = timeMatch;
  const minute = Number(minuteText);
  let hour = Number(hourText);
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  hour %= 12;
  if (meridiem === "PM") hour += 12;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const year = Number(getPart("year"));
  const month = Number(getPart("month"));
  const dayOfMonth = Number(getPart("day"));
  const currentWeekday = WEEKDAYS.indexOf(getPart("weekday"));
  if (!year || !month || !dayOfMonth || currentWeekday < 0) return null;

  let daysAhead = (targetWeekday - currentWeekday + 7) % 7;
  const scheduledAt = () =>
    new Date(
      Date.UTC(year, month - 1, dayOfMonth + daysAhead, hour - 3, minute)
    );
  let result = scheduledAt();
  if (result <= new Date()) {
    daysAhead += 7;
    result = scheduledAt();
  }
  return result;
}

function toSessionResponse(session: MentorSessionDocument) {
  return {
    id: session._id,
    mentorApplicationId: session.mentorApplicationId,
    mentor: session.mentor,
    menteeName: session.menteeName,
    day: session.day,
    timeSlot: session.timeSlot,
    topic: session.topic,
    scheduledAt: session.scheduledAt.toISOString(),
    bookedAt: session.createdAt.toISOString().slice(0, 10),
    status: session.status,
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Sign in to view mentorship sessions." },
      { status: 401 }
    );
  }

  try {
    const db = await getDb();
    const viewAsMentor =
      new URL(request.url).searchParams.get("view") === "mentor";
    let filter: {
      mentorUserId?: string;
      menteeUserId?: string;
      status?: MentorSessionDocument["status"];
      scheduledAt?: { $gte: Date };
    };

    if (viewAsMentor) {
      const application = await db
        .collection<MentorApplicationDocument>("mentorApplications")
        .findOne({ userId: session.user.id, status: "Approved" });
      if (!application) {
        return NextResponse.json(
          { success: false, message: "An approved mentor profile is required." },
          { status: 403 }
        );
      }
      filter = {
        mentorUserId: session.user.id,
        status: "Upcoming",
        scheduledAt: { $gte: new Date() },
      };
    } else {
      filter = { menteeUserId: session.user.id };
    }

    const sessions = await db
      .collection<MentorSessionDocument>("mentorSessions")
      .find(filter)
      .sort({ scheduledAt: viewAsMentor ? 1 : -1 })
      .toArray();
    return NextResponse.json({
      success: true,
      data: sessions.map(toSessionResponse),
    });
  } catch (error) {
    console.error("[MENTOR_SESSIONS_GET_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Could not load mentorship sessions." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Sign in before booking a mentorship session." },
      { status: 401 }
    );
  }

  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Invalid session details." },
        { status: 400 }
      );
    }
    const input = body as Record<string, unknown>;
    const mentorApplicationId =
      typeof input.mentorApplicationId === "string"
        ? input.mentorApplicationId.trim()
        : "";
    const day = typeof input.day === "string" ? input.day : "";
    const timeSlot = typeof input.timeSlot === "string" ? input.timeSlot : "";
    const topic = typeof input.topic === "string" ? input.topic.trim() : "";
    const scheduledAt =
      TIME_SLOTS.includes(timeSlot) ? toNairobiScheduledAt(day, timeSlot) : null;

    if (
      !mentorApplicationId ||
      mentorApplicationId.length > 128 ||
      !scheduledAt ||
      topic.length < 5 ||
      topic.length > 600
    ) {
      return NextResponse.json(
        { success: false, message: "Choose an available day and time and enter a topic between 5 and 600 characters." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const application = await db
      .collection<MentorApplicationDocument>("mentorApplications")
      .findOne({
        _id: mentorApplicationId,
        status: "Approved",
        publicProfileConsent: true,
      });
    if (!application || !application.availableDays.includes(day)) {
      return NextResponse.json(
        { success: false, message: "This mentor is not available for booking." },
        { status: 404 }
      );
    }
    if (application.userId === session.user.id) {
      return NextResponse.json(
        { success: false, message: "You cannot book a session with your own mentor profile." },
        { status: 400 }
      );
    }

    const [mentorUser, menteeUser] = await Promise.all([
      db
        .collection<UserDocument>("users")
        .findOne({ _id: application.userId }, { projection: { image: 1 } }),
      db
        .collection<UserDocument>("users")
        .findOne({ _id: session.user.id }, { projection: { name: 1 } }),
    ]);
    if (!mentorUser || !menteeUser) {
      return NextResponse.json(
        { success: false, message: "The mentor or your account could not be found." },
        { status: 409 }
      );
    }

    const mentor: Mentor = {
      id: application._id,
      name: application.fullName,
      title: application.title,
      organization: application.organization,
      avatar:
        mentorUser.image ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(application.fullName)}`,
      county: application.county,
      specialties: application.specialties,
      bio: application.bio,
      linkedinUrl: application.linkedinUrl,
      ...(application.websiteUrl ? { websiteUrl: application.websiteUrl } : {}),
      ...(application.githubUrl ? { githubUrl: application.githubUrl } : {}),
      ...(application.xUrl ? { xUrl: application.xUrl } : {}),
      experienceYears: application.experienceYears,
      availableDays: application.availableDays,
      sessionDuration: "30 mins",
      rating: 0,
      sessionsCompleted: 0,
      isVerified: true,
      isBookable: true,
    };
    const now = new Date();
    const record: MentorSessionDocument = {
      _id: randomUUID(),
      mentorApplicationId: application._id,
      mentorUserId: application.userId,
      menteeUserId: session.user.id,
      menteeName: menteeUser.name,
      mentor,
      day,
      timeSlot,
      topic,
      scheduledAt,
      status: "Upcoming",
      createdAt: now,
      updatedAt: now,
    };

    const sessions = db.collection<MentorSessionDocument>("mentorSessions");
    const existingBooking = await sessions.findOne(
      {
        mentorUserId: application.userId,
        scheduledAt,
        status: "Upcoming",
      },
      { projection: { _id: 1 } }
    );
    if (existingBooking) {
      return NextResponse.json(
        { success: false, message: "That time is already booked. Please choose another slot." },
        { status: 409 }
      );
    }

    await sessions.insertOne(record);
    return NextResponse.json(
      { success: true, data: toSessionResponse(record) },
      { status: 201 }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { success: false, message: "That time was just booked. Please choose another slot." },
        { status: 409 }
      );
    }
    console.error("[MENTOR_SESSION_CREATE_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Could not book this mentorship session." },
      { status: 500 }
    );
  }
}
