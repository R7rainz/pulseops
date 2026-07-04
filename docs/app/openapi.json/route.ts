// Same-origin proxy for the backend's OpenAPI document, so Scalar fetches the
// spec without CORS and the API host stays internal. The spec is public.
const API_URL = process.env.API_URL || "http://127.0.0.1:4000";

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
