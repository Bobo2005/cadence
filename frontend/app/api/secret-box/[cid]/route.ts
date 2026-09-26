import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".cache", "secret-boxes");

interface RouteContext {
  params: Promise<{ cid: string }>;
}

/**
 * Sanitizes CID to prevent directory traversal attacks.
 */
function sanitizeCid(cid: string): string {
  return cid.replace(/[^a-zA-Z0-9_-]/g, "");
}

/**
 * GET /api/secret-box/[cid]
 *
 * Streams raw encrypted octet-stream bytes for an anchored Secret Box.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { cid } = await context.params;
    const cleanCid = sanitizeCid(cid);

    if (!cleanCid) {
      return NextResponse.json({ error: "Invalid CID parameter" }, { status: 400 });
    }

    // 1. Check local cache first for zero-latency retrieval
    const localFilePath = path.join(CACHE_DIR, `${cleanCid}.bin`);
    try {
      const fileBuffer = await fs.readFile(localFilePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      });
    } catch {
      // Not found locally, attempt to fetch from IPFS gateways
    }

    // 2. Fetch from Pinata Gateway or Public IPFS
    const gateways = [
      process.env.PINATA_GATEWAY_URL ? `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${cleanCid}` : null,
      `https://gateway.pinata.cloud/ipfs/${cleanCid}`,
      `https://ipfs.io/ipfs/${cleanCid}`,
    ].filter(Boolean) as string[];

    for (const gatewayUrl of gateways) {
      try {
        const ipfsRes = await fetch(gatewayUrl, {
          headers: process.env.PINATA_JWT ? { Authorization: `Bearer ${process.env.PINATA_JWT}` } : {},
          signal: AbortSignal.timeout(6000),
        });

        if (ipfsRes.ok) {
          const arrayBuffer = await ipfsRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Cache locally for subsequent requests
          try {
            await fs.mkdir(CACHE_DIR, { recursive: true });
            await fs.writeFile(localFilePath, buffer);
          } catch {
            // Non-critical cache write error
          }

          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": "application/octet-stream",
              "Cache-Control": "public, max-age=31536000, immutable",
              "X-Content-Type-Options": "nosniff",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
            },
          });
        }
      } catch {
        // Try next gateway
      }
    }

    return NextResponse.json(
      { error: "Encrypted secret box payload not found on IPFS gateways" },
      { status: 404 }
    );
  } catch (error: unknown) {
    console.error("[SecretBox Download Error]:", error);
    const msg = error instanceof Error ? error.message : "Internal server error fetching secret box";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
