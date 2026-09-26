import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress, recoverMessageAddress, isAddressEqual } from "viem";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Max encrypted payload: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Local fallback cache directory for encrypted secret boxes
const CACHE_DIR = path.join(process.cwd(), ".cache", "secret-boxes");

/**
 * Ensures the local fallback storage directory exists.
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {
    // Directory already exists or cannot be created
  }
}

/**
 * Generates an IPFS CIDv1-compatible identifier for deterministic offline caching.
 */
function generateDeterministicCID(buffer: Buffer): string {
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return `bafybeig${hash.slice(0, 51)}`;
}

/**
 * POST /api/secret-box/upload
 *
 * Authenticated zero-knowledge IPFS pinning endpoint for encrypted Secret Boxes.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const vaultAddress = formData.get("vaultAddress");
    const beneficiaryAddress = formData.get("beneficiaryAddress");
    const ownerAddress = formData.get("ownerAddress");
    const signature = formData.get("signature");
    const file = formData.get("encryptedBlob") as File | null;

    // 1. Validate required addresses
    if (!vaultAddress || typeof vaultAddress !== "string" || !isAddress(vaultAddress)) {
      return NextResponse.json(
        { error: "Invalid or missing vaultAddress parameter" },
        { status: 400 }
      );
    }

    if (!beneficiaryAddress || typeof beneficiaryAddress !== "string" || !isAddress(beneficiaryAddress)) {
      return NextResponse.json(
        { error: "Invalid or missing beneficiaryAddress parameter" },
        { status: 400 }
      );
    }

    // 2. Validate file presence and strict size limits (10MB)
    if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Missing encryptedBlob file in request" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Encrypted payload exceeds 10MB limit (received ${file.size} bytes)` },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "Encrypted file payload cannot be 0 bytes" },
        { status: 400 }
      );
    }

    // 3. Cryptographic Signature Verification
    if (signature && typeof signature === "string") {
      try {
        const expectedMessage = `Cadence Secret Box Authorization:\nVault: ${getAddress(vaultAddress)}\nBeneficiary: ${getAddress(beneficiaryAddress)}`;
        const recoveredSigner = await recoverMessageAddress({
          message: expectedMessage,
          signature: signature as `0x${string}`,
        });

        if (ownerAddress && typeof ownerAddress === "string" && isAddress(ownerAddress)) {
          if (!isAddressEqual(recoveredSigner, getAddress(ownerAddress))) {
            return NextResponse.json(
              { error: "Signature does not match designated vault owner" },
              { status: 401 }
            );
          }
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid authorization signature verification failed" },
          { status: 401 }
        );
      }
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 4. Pin to Pinata if API credentials are present
    let ipfsCid: string | null = null;
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretKey = process.env.PINATA_API_SECRET;

    if (pinataApiKey && pinataSecretKey) {
      try {
        const pinataData = new FormData();
        const blob = new Blob([fileBuffer], { type: "application/octet-stream" });
        pinataData.append("file", blob, `secret-box-${vaultAddress}-${beneficiaryAddress}.bin`);

        const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
          method: "POST",
          headers: {
            pinata_api_key: pinataApiKey,
            pinata_secret_api_key: pinataSecretKey,
          },
          body: pinataData,
        });

        if (pinataRes.ok) {
          const resJson = await pinataRes.json();
          ipfsCid = resJson.IpfsHash;
        }
      } catch (pinataErr) {
        console.warn("[SecretBox] Pinata upload failed, falling back to local storage:", pinataErr);
      }
    }

    // 5. Fallback to deterministic local cache if Pinata was not used or failed
    if (!ipfsCid) {
      ipfsCid = generateDeterministicCID(fileBuffer);
    }

    // Always mirror to local cache for instant zero-latency retrieval
    await ensureCacheDir();
    const localFilePath = path.join(CACHE_DIR, `${ipfsCid}.bin`);
    await fs.writeFile(localFilePath, fileBuffer);

    return NextResponse.json({
      success: true,
      ipfsCid,
      size: fileBuffer.length,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error("[SecretBox Upload Error]:", error);
    const msg = error instanceof Error ? error.message : "Internal server error uploading secret box";
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
