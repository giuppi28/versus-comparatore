/**
 * GET /api/comuni?q=<text> — autocomplete source for Page 1 (PRD §6 Block C).
 * Returns at most 10 municipalities (case/accent-insensitive match on the name) with
 * province, CAPs and official climate zone. Public data, lightly rate limited per IP.
 */
import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { clientIp, SlidingWindowRateLimiter } from "@/lib/lead/rate-limit";
import {
  COMUNI_MAX_QUERY_LENGTH,
  COMUNI_MAX_RESULTS,
  COMUNI_MIN_QUERY_LENGTH,
  type ComuniResponse,
} from "./types";

/** Typing triggers one request per debounce tick, so the window is generous. */
const limiter = new SlidingWindowRateLimiter({ limit: 120, windowMs: 60_000 });

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: Request) {
  const rate = limiter.hit(clientIp(request.headers));
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, COMUNI_MAX_QUERY_LENGTH);
  if (q.length < COMUNI_MIN_QUERY_LENGTH) {
    return NextResponse.json<ComuniResponse>({ comuni: [] }, { headers: NO_STORE });
  }

  try {
    const found = await getRepository().searchComuni(q, COMUNI_MAX_RESULTS);
    const body: ComuniResponse = {
      comuni: found.slice(0, COMUNI_MAX_RESULTS).map((c) => ({
        istat: c.istat_code,
        name: c.name,
        province: c.province_code,
        provinceName: c.province_name,
        caps: c.caps,
        climateZone: c.climate_zone,
      })),
    };
    return NextResponse.json(body, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
