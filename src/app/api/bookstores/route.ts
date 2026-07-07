import { NextResponse } from "next/server";
import { fetchAllBookstores } from "@/lib/bookstores";
import type { BookstoresApiResult } from "@/types/bookstore";

export const dynamic = "force-dynamic";

let cache: BookstoresApiResult | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function GET() {
  const serviceKey = process.env.CULTURE_API_KEY;

  if (!serviceKey) {
    return NextResponse.json(
      {
        error: "CULTURE_API_KEY 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.",
      },
      { status: 500 },
    );
  }

  const now = Date.now();

  if (cache && now < cacheExpiresAt) {
    return NextResponse.json(cache);
  }

  try {
    const bookstores = await fetchAllBookstores(serviceKey);
    const result: BookstoresApiResult = {
      bookstores,
      totalCount: bookstores.length,
      cached: false,
      fetchedAt: new Date().toISOString(),
    };

    cache = { ...result, cached: true };
    cacheExpiresAt = now + CACHE_TTL_MS;

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";

    if (cache) {
      return NextResponse.json({
        ...cache,
        cached: true,
        stale: true,
        error: message,
      });
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
