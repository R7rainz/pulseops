import { API_URL } from "@/lib/constants";

// Same-origin proxy for the backend's OpenAPI document. Fetching it here
// (server-side) instead of pointing the docs client straight at :4000 keeps
// the spec on the frontend origin — no CORS, and the backend host stays
// internal. The spec is public, so no auth is forwarded.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/docs/openapi.json`, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { message: "API specification is unavailable." },
        { status: 502 },
      );
    }
    const spec = await res.text();
    return new Response(spec, {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return Response.json(
      { message: "Could not reach the API server." },
      { status: 502 },
    );
  }
}
