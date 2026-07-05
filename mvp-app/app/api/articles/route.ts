import { NextResponse } from "next/server";
import { fetchAllArticles } from "@/lib/adapters";

// We need node:sqlite, so ensure this never runs on edge runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await fetchAllArticles({ refresh: false });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        articles: [],
        sources: [],
        errors: [
          {
            adapter: "route",
            message: err instanceof Error ? err.message : String(err),
          },
        ],
        meta: {
          cached: false,
          fetchedAt: new Date().toISOString(),
          totalRaw: 0,
          deduped: 0,
        },
      },
      { status: 500 },
    );
  }
}
