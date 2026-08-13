import { getSessionUser } from "@/lib/auth";
import { getLiveMetricsSnapshot } from "@/lib/live-metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_MS = 45_000;
const HEARTBEAT_MS = 25_000;

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let lastVersion = "";
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const pushSnapshot = async () => {
        if (closed) return;
        try {
          const snapshot = await getLiveMetricsSnapshot(user);
          if (snapshot.version !== lastVersion) {
            lastVersion = snapshot.version;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`));
          }
        } catch {
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ message: "snapshot_failed" })}\n\n`)
          );
        }
      };

      void pushSnapshot();

      pollTimer = setInterval(() => void pushSnapshot(), POLL_MS);
      heartbeatTimer = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, HEARTBEAT_MS);

      request.signal.addEventListener("abort", () => {
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      closed = true;
      if (pollTimer) clearInterval(pollTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
