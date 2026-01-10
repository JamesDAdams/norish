import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { SERVER_CONFIG } from "@/config/env-config-server";

export const runtime = "nodejs";
const VIDEOS_DISK_DIR = path.join(SERVER_CONFIG.UPLOADS_DIR, "video");

export async function GET(req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const filePath = path.join(VIDEOS_DISK_DIR, filename);

  try {
    const file = await fs.readFile(filePath);

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (_error) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
}
