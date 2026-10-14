import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getDb,
  type OpportunityDocument,
  type SavedOpportunityDocument,
} from "@/server/lib/mongodb";

const MAX_SAVED_OPPORTUNITIES = 500;

function parseOpportunityIds(value: unknown): string[] | null {
  if (
    !Array.isArray(value) ||
    value.length > MAX_SAVED_OPPORTUNITIES ||
    !value.every(
      (id) => typeof id === "string" && id.length > 0 && id.length <= 128
    )
  ) {
    return null;
  }
  return [...new Set(value)];
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Sign in to view saved opportunities." },
      { status: 401 }
    );
  }

  try {
    const db = await getDb();
    const savedRecords = await db
      .collection<SavedOpportunityDocument>("savedOpportunities")
      .find({ userId: session.user.id })
      .sort({ savedAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: savedRecords.map((record) => record.opportunityId),
    });
  } catch (error) {
    console.error("[SAVED_OPPORTUNITIES_GET_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load saved opportunities." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Sign in to save opportunities to your account." },
      { status: 401 }
    );
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid saved opportunity data." },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;
    const isBulkSync = Object.hasOwn(input, "opportunityIds");
    const requestedIds = isBulkSync
      ? parseOpportunityIds(input.opportunityIds)
      : parseOpportunityIds([input.opportunityId]);
    if (!requestedIds) {
      return NextResponse.json(
        { success: false, message: "Invalid saved opportunity IDs." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const opportunityRecords = await db
      .collection<OpportunityDocument>("opportunities")
      .find({ _id: { $in: requestedIds } }, { projection: { _id: 1 } })
      .toArray();
    const validIds = opportunityRecords.map((record) => record._id);
    if (!isBulkSync && validIds.length !== 1) {
      return NextResponse.json(
        { success: false, message: "Opportunity not found." },
        { status: 404 }
      );
    }

    if (validIds.length > 0) {
      await db.collection<SavedOpportunityDocument>("savedOpportunities").bulkWrite(
        validIds.map((opportunityId) => ({
          updateOne: {
            filter: { userId: session.user.id, opportunityId },
            update: {
              $setOnInsert: {
                _id: randomUUID(),
                userId: session.user.id,
                opportunityId,
                savedAt: new Date(),
              },
            },
            upsert: true,
          },
        }))
      );
    }

    const savedRecords = await db
      .collection<SavedOpportunityDocument>("savedOpportunities")
      .find({ userId: session.user.id })
      .sort({ savedAt: -1 })
      .toArray();
    return NextResponse.json({
      success: true,
      data: savedRecords.map((record) => record.opportunityId),
    });
  } catch (error) {
    console.error("[SAVED_OPPORTUNITIES_SAVE_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save opportunity." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Sign in to manage saved opportunities." },
      { status: 401 }
    );
  }

  try {
    const body: unknown = await request.json();
    const opportunityId =
      body && typeof body === "object" && "opportunityId" in body
        ? body.opportunityId
        : null;
    if (
      typeof opportunityId !== "string" ||
      opportunityId.length === 0 ||
      opportunityId.length > 128
    ) {
      return NextResponse.json(
        { success: false, message: "A valid opportunity ID is required." },
        { status: 400 }
      );
    }

    const db = await getDb();
    await db.collection<SavedOpportunityDocument>("savedOpportunities").deleteOne({
      userId: session.user.id,
      opportunityId,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SAVED_OPPORTUNITIES_DELETE_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to remove saved opportunity." },
      { status: 500 }
    );
  }
}