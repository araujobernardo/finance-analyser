import type { IncomingMessage, ServerResponse } from "node:http";

// Dynamic import to surface any module-level crash in Vercel function logs
// rather than letting it swallow as a generic FUNCTION_INVOCATION_FAILED.
// Remove once root cause is identified and fixed.
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const mod = await import("../src/server/index.ts");
    console.log("[api] server module loaded ok");
    (mod.default as (req: IncomingMessage, res: ServerResponse) => void)(
      req,
      res,
    );
  } catch (err) {
    console.error("[api] server load error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server load error: " + String(err) }));
  }
}
