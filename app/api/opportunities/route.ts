import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { KENYA_COUNTIES, SAMPLE_OPPORTUNITIES } from "@/server/data/opportunities";
import { getDb, type OpportunityDocument } from "@/server/lib/mongodb";
import type { Opportunity, OpportunityCategory } from "@/server/types/opportunity";

type StoredOpportunityCategory = Exclude<OpportunityCategory, "All">;

const CATEGORIES: StoredOpportunityCategory[] = [
  "Grants & Funding",
  "Incubators & Accelerators",
  "Hackathons & Challenges",
  "Fellowships & Training",
  "Scholarships",
];

function isStoredCategory(value: unknown): value is StoredOpportunityCategory {
  return typeof value === "string" && CATEGORIES.includes(value as StoredOpportunityCategory);
}

function toOpportunity(record: OpportunityDocument): Opportunity {
  return {
    id: record._id,
    title: record.title,
    organization: record.organization,
    category: record.category,
    county: record.county,
    grantAmount: record.grantAmount,
    grantAmountLabel: record.grantAmountLabel,
    deadline: record.deadline,
    description: record.description,
    eligibility: record.eligibility,
    tags: record.tags,
    featured: record.featured,
    ...(record.applicationUrl ? { applicationUrl: record.applicationUrl } : {}),
  };
}

function isApplicationUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function isValidDeadline(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseOpportunity(value: Record<string, unknown>) {
  if (
    typeof value.title !== "string" ||
    !value.title.trim() ||
    typeof value.organization !== "string" ||
    !value.organization.trim() ||
    !isStoredCategory(value.category) ||
    typeof value.county !== "string" ||
    !KENYA_COUNTIES.includes(value.county) ||
    typeof value.grantAmount !== "number" ||
    !Number.isFinite(value.grantAmount) ||
    typeof value.grantAmountLabel !== "string" ||
    typeof value.deadline !== "string" ||
    typeof value.description !== "string" ||
    !Array.isArray(value.eligibility) ||
    !value.eligibility.every((entry) => typeof entry === "string") ||
    !Array.isArray(value.tags) ||
    !value.tags.every((entry) => typeof entry === "string") ||
    (value.category === "Scholarships" &&
      (!isApplicationUrl(value.applicationUrl) ||
        !isValidDeadline(value.deadline))) ||
    (value.applicationUrl != null &&
      value.applicationUrl !== "" &&
      !isApplicationUrl(value.applicationUrl))
  ) {
    return null;
  }

  return {
    title: value.title.trim(),
    organization: value.organization.trim(),
    category: value.category,
    county: value.county,
    grantAmount: value.grantAmount,
    grantAmountLabel: value.grantAmountLabel.trim(),
    deadline: value.deadline,
    description: value.description.trim(),
    eligibility: value.eligibility,
    tags: value.tags,
    featured: value.featured === true,
    ...(typeof value.applicationUrl === "string" && value.applicationUrl.trim()
      ? { applicationUrl: value.applicationUrl.trim() }
      : {}),
  };
}

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function GET() {
  try {
    const db = await getDb();
    const opportunities = db.collection<OpportunityDocument>("opportunities");

    await Promise.all(
      SAMPLE_OPPORTUNITIES.map(({ id, ...fields }) =>
        opportunities.updateOne(
          { _id: id },
          {
            $setOnInsert: {
              ...fields,
              category: fields.category as StoredOpportunityCategory,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        )
      )
    );

    const records = await opportunities.find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(
      {
        success: true,
        data: records.map(toOpportunity),
        checkedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[OPPORTUNITIES_GET_ERROR]:", error);
    return NextResponse.json(
      {
        success: true,
        data: SAMPLE_OPPORTUNITIES,
        checkedAt: new Date().toISOString(),
        fallback: true,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { success: false, message: "Admin access is required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const opportunity = parseOpportunity(body);
    if (!opportunity) {
      return NextResponse.json(
        { success: false, message: "Invalid opportunity details." },
        { status: 400 }
      );
    }

    const now = new Date();
    const record: OpportunityDocument = {
      _id: randomUUID(),
      ...opportunity,
      createdAt: now,
      updatedAt: now,
    };
    const db = await getDb();
    await db.collection<OpportunityDocument>("opportunities").insertOne(record);
    return NextResponse.json(
      { success: true, data: toOpportunity(record) },
      { status: 201 }
    );
  } catch (error) {
    console.error("[OPPORTUNITIES_CREATE_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create opportunity." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { success: false, message: "Admin access is required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    const opportunity = parseOpportunity(body);
    if (!id || !opportunity) {
      return NextResponse.json(
        { success: false, message: "Invalid opportunity details." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.collection<OpportunityDocument>("opportunities").findOneAndUpdate(
      { _id: id },
      { $set: { ...opportunity, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!result) {
      return NextResponse.json(
        { success: false, message: "Opportunity not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: toOpportunity(result) });
  } catch (error) {
    console.error("[OPPORTUNITIES_UPDATE_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update opportunity." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { success: false, message: "Admin access is required." },
      { status: 403 }
    );
  }

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Opportunity ID is required." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.collection<OpportunityDocument>("opportunities").deleteOne({ _id: id });
    if (!result.deletedCount) {
      return NextResponse.json(
        { success: false, message: "Opportunity not found." },
        { status: 404 }
      );
    }
    await db.collection("applications").deleteMany({ opportunityId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[OPPORTUNITIES_DELETE_ERROR]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete opportunity." },
      { status: 500 }
    );
  }
}
