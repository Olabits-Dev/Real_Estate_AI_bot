import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  const widgetPath = path.join(process.cwd(), "src", "public", "widget.js");
  const script = await readFile(widgetPath, "utf8");

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

