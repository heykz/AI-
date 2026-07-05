import { NextResponse } from "next/server";
import { fetchAllArticles } from "@/lib/adapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await fetchAllArticles({ refresh: true });
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
