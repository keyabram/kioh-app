import { NextResponse } from "next/server";
import { getDb, type VerifiedOrganizationDocument } from "@/server/lib/mongodb";

const FALLBACK_ORGANIZATIONS = [
  { name: "KIOH", verifiedAt: "2025-01-15T00:00:00.000Z" },
  { name: "Nairobi Tech Hub", verifiedAt: "2025-02-04T00:00:00.000Z" },
  { name: "Kenya Climate Innovation Center", verifiedAt: "2025-03-11T00:00:00.000Z" },
];

export async function GET() {
  try {
    const organizations = await (await getDb())
      .collection<VerifiedOrganizationDocument>("verifiedOrganizations")
      .find({ publicConsent: true })
      .sort({ name: 1 })
      .project<{ name: string; verifiedAt: Date }>({
        _id: 0,
        name: 1,
        verifiedAt: 1,
      })
      .toArray();

    return NextResponse.json({ success: true, data: organizations });
  } catch (error) {
    console.error("[VERIFIED_ORGANIZATIONS_GET_ERROR]:", error);
    return NextResponse.json({
      success: true,
      data: FALLBACK_ORGANIZATIONS,
      fallback: true,
    });
  }
}
