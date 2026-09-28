/**
 * Test Suite verifying Cloudflare Pages Functions logic
 */
import { PDFDocument } from "pdf-lib";
import { signToken, verifyToken, corsHeaders } from "../functions/types";

async function runCloudflareTests() {
  console.log("=== Testing Cloudflare Pages Functions Architecture ===");
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => Promise<void> | void) {
    total++;
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`[FAIL] ${name}:`, e.message);
    }
  }

  async function testAsync(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`[FAIL] ${name}:`, e.message);
    }
  }

  // 1. WebCrypto Token signing & verification
  await testAsync("Cloudflare Edge Auth (HMAC Token Sign & Verify)", async () => {
    const payload = { id: "usr_test123", email: "user@example.com", name: "Tester" };
    const secret = "test-secret-key-123";
    const token = await signToken(payload, secret);
    if (!token || typeof token !== "string" || token.split(".").length !== 3) {
      throw new Error("Invalid JWT token format");
    }
    const verified = await verifyToken(token, secret);
    if (!verified || verified.id !== payload.id || verified.email !== payload.email) {
      throw new Error("Token verification failed");
    }
  });

  // 1b. Expired token rejection
  await testAsync("Cloudflare Edge Auth (Expired Token Rejection)", async () => {
    const payload = { id: "usr_expired", email: "expired@example.com" };
    const secret = "test-secret-key-123";
    // Sign with -10 seconds expiration
    const token = await signToken(payload, secret, -10);
    const verified = await verifyToken(token, secret);
    if (verified !== null) {
      throw new Error("Expired token was unexpectedly accepted");
    }
  });

  // 1c. Safe CORS Headers (No wildcard with credentials)
  test("Cloudflare CORS Security (Credentials never paired with wildcard origin)", () => {
    const reqWithOrigin = new Request("https://smartai.tools/api/usage", {
      headers: { Origin: "https://smart-ai.pages.dev" },
    });
    const headersOrigin = corsHeaders(reqWithOrigin) as Record<string, string>;
    if (headersOrigin["Access-Control-Allow-Origin"] === "*" && headersOrigin["Access-Control-Allow-Credentials"] === "true") {
      throw new Error("Wildcard origin paired with credentials");
    }
    if (headersOrigin["Access-Control-Allow-Origin"] !== "https://smart-ai.pages.dev") {
      throw new Error("Failed to echo valid Origin header");
    }

    const reqNoOrigin = new Request("https://smartai.tools/api/usage");
    const headersNoOrigin = corsHeaders(reqNoOrigin) as Record<string, string>;
    if (headersNoOrigin["Access-Control-Allow-Credentials"] === "true") {
      throw new Error("Credentials allowed on unverified originless request");
    }
  });

  // 2. Pure JavaScript PDF generation using pdf-lib (Cloudflare Edge compatible)
  await testAsync("Cloudflare Edge PDF Generation (pdf-lib ArrayBuffer creation)", async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    page.drawText("Smart AI Cloudflare Edge PDF Test", { x: 50, y: 350 });
    const bytes = await pdfDoc.save();
    if (bytes.byteLength < 50) {
      throw new Error("Generated PDF too small");
    }
    const verifyDoc = await PDFDocument.load(bytes);
    if (verifyDoc.getPageCount() !== 1) {
      throw new Error("Page count mismatch");
    }
  });

  console.log(`=======================================================`);
  console.log(`Cloudflare Functions Tests: ${passed}/${total} passed`);
  if (passed === total) {
    console.log("All Cloudflare architecture tests passed successfully!");
  } else {
    process.exit(1);
  }
}

runCloudflareTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
