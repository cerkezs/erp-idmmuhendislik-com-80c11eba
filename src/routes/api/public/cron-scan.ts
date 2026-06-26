import { createFileRoute } from "@tanstack/react-router";
import { runNotificationTriggers } from "@/lib/nocodb.functions";

export const Route = createFileRoute("/api/public/cron-scan")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request) {
  const expected = process.env.CRON_TOKEN || process.env.HEALTH_API_TOKEN || "";
  if (!expected) {
    return Response.json({ ok: false, error: "CRON_TOKEN not configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  const qsToken = url.searchParams.get("token") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const provided = bearer || qsToken;
  if (provided !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runNotificationTriggers();
    return Response.json({ ok: true, ranAt: new Date().toISOString(), result });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
