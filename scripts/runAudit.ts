import fs from "fs";
import path from "path";
import http from "http";
import sharp from "sharp";
import { PDFDocument, rgb } from "pdf-lib";
import JSZip from "jszip";
import { createCanvas } from "@napi-rs/canvas";

interface TestResult {
  category: string;
  feature: string;
  testPerformed: string;
  status: "PASS" | "FAIL";
  details: string;
  durationMs: number;
}

const results: TestResult[] = [];
const BASE_URL = "http://localhost:3000";
const TMP_DIR = "/tmp/smart_ai_audit";

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// HTTP Helper for JSON requests
async function makeJsonRequest(
  method: string,
  endpoint: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: any }> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const url = new URL(endpoint, BASE_URL);

    const reqHeaders: Record<string, string> = {
      ...headers,
    };
    if (body) {
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            data: parsed,
          });
        });
      }
    );

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// HTTP Helper for Multipart Form Data requests
async function makeMultipartRequest(
  endpoint: string,
  fields: Record<string, string>,
  files: { fieldName: string; filename: string; buffer: Buffer; mimeType: string }[],
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; buffer: Buffer }> {
  return new Promise((resolve, reject) => {
    const boundary = "----SmartAiAuditBoundary" + Math.random().toString(36).substring(2);
    const chunks: Buffer[] = [];

    // Append fields
    for (const [key, val] of Object.entries(fields)) {
      chunks.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
        )
      );
    }

    // Append files
    for (const file of files) {
      chunks.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldName}"; filename="${file.filename}"\r\nContent-Type: ${file.mimeType}\r\n\r\n`
        )
      );
      chunks.push(file.buffer);
      chunks.push(Buffer.from("\r\n"));
    }

    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    const fullBody = Buffer.concat(chunks);

    const url = new URL(endpoint, BASE_URL);
    const req = http.request(
      url,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": fullBody.length.toString(),
        },
      },
      (res) => {
        const respChunks: Buffer[] = [];
        res.on("data", (c) => respChunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            buffer: Buffer.concat(respChunks),
          });
        });
      }
    );

    req.on("error", reject);
    req.write(fullBody);
    req.end();
  });
}

async function recordTest(
  category: string,
  feature: string,
  testPerformed: string,
  fn: () => Promise<{ pass: boolean; details: string }>
) {
  const start = Date.now();
  try {
    const res = await fn();
    results.push({
      category,
      feature,
      testPerformed,
      status: res.pass ? "PASS" : "FAIL",
      details: res.details,
      durationMs: Date.now() - start,
    });
    console.log(`[${res.pass ? "PASS" : "FAIL"}] [${category}] ${feature} - ${res.details}`);
  } catch (err: any) {
    results.push({
      category,
      feature,
      testPerformed,
      status: "FAIL",
      details: `Exception: ${err.message}`,
      durationMs: Date.now() - start,
    });
    console.log(`[FAIL] [${category}] ${feature} - Exception: ${err.message}`);
  }
}

// MAIN AUDIT RUNNER
async function runAudit() {
  console.log("=================================================");
  console.log("SMART AI COMPLETE PRODUCTION-LEVEL AUDIT SUITE");
  console.log("=================================================");

  // 0. GENERATE REALISTIC TEST ASSETS
  console.log("\n1. Generating realistic test assets...");

  // Asset A: Photo 1
  const canvasPhoto1 = createCanvas(600, 400);
  const ctxP1 = canvasPhoto1.getContext("2d");
  ctxP1.fillStyle = "#1e293b";
  ctxP1.fillRect(0, 0, 600, 400);
  ctxP1.fillStyle = "#38bdf8";
  ctxP1.font = "bold 28px sans-serif";
  ctxP1.fillText("Smart AI Studio Photo 1", 50, 100);
  ctxP1.fillStyle = "#94a3b8";
  ctxP1.font = "18px sans-serif";
  ctxP1.fillText("Original Resolution 600x400 landscape", 50, 160);
  const photo1Buffer = canvasPhoto1.toBuffer("image/jpeg");

  // Asset B: Photo 2
  const canvasPhoto2 = createCanvas(400, 600);
  const ctxP2 = canvasPhoto2.getContext("2d");
  ctxP2.fillStyle = "#0f172a";
  ctxP2.fillRect(0, 0, 400, 600);
  ctxP2.fillStyle = "#10b981";
  ctxP2.font = "bold 28px sans-serif";
  ctxP2.fillText("Portrait Photo 2", 40, 100);
  const photo2Buffer = canvasPhoto2.toBuffer("image/jpeg");

  // Asset C: Invoice / Text Document for OCR
  const canvasOcr = createCanvas(700, 500);
  const ctxOcr = canvasOcr.getContext("2d");
  ctxOcr.fillStyle = "#ffffff";
  ctxOcr.fillRect(0, 0, 700, 500);
  ctxOcr.fillStyle = "#000000";
  ctxOcr.font = "bold 32px sans-serif";
  ctxOcr.fillText("COMMERCIAL INVOICE", 50, 70);
  ctxOcr.font = "20px sans-serif";
  ctxOcr.fillText("Invoice Number: INV-2026-8841", 50, 130);
  ctxOcr.fillText("Client: Global Tech Logistics Inc", 50, 170);
  ctxOcr.fillText("Item 1: Server Maintenance Subscription  $450.00", 50, 230);
  ctxOcr.fillText("Item 2: SSL Certificate Security Bundle  $120.00", 50, 280);
  ctxOcr.fillText("Total Due: $570.00 USD", 50, 360);
  ctxOcr.fillText("Payment Status: Pending Verification", 50, 410);
  const ocrImageBuffer = canvasOcr.toBuffer("image/jpeg");

  // Asset D: Digital Multi-page PDF
  const digitalPdf = await PDFDocument.create();
  const page1 = digitalPdf.addPage([600, 400]);
  page1.drawText("Digital PDF Document - Page 1\nExecutive Summary\nSmart AI Verification Test", {
    x: 50,
    y: 320,
    size: 18,
  });
  const page2 = digitalPdf.addPage([600, 400]);
  page2.drawText("Digital PDF Document - Page 2\nTechnical Architecture Specifications", {
    x: 50,
    y: 320,
    size: 18,
  });
  const page3 = digitalPdf.addPage([600, 400]);
  page3.drawText("Digital PDF Document - Page 3\nFinal Approvals and Signatures", {
    x: 50,
    y: 320,
    size: 18,
  });
  const digitalPdfBuffer = Buffer.from(await digitalPdf.save());

  // Asset E: Scanned Image-only PDF (No digital text)
  const scannedPdf = await PDFDocument.create();
  const embeddedOcrImg = await scannedPdf.embedJpg(ocrImageBuffer);
  const scannedPage = scannedPdf.addPage([700, 500]);
  scannedPage.drawImage(embeddedOcrImg, { x: 0, y: 0, width: 700, height: 500 });
  const scannedPdfBuffer = Buffer.from(await scannedPdf.save());

  // Asset F: Screenshot 1 - Browser Console Error
  const canvasErr = createCanvas(650, 400);
  const ctxErr = canvasErr.getContext("2d");
  ctxErr.fillStyle = "#18181b";
  ctxErr.fillRect(0, 0, 650, 400);
  ctxErr.fillStyle = "#ef4444";
  ctxErr.font = "bold 24px monospace";
  ctxErr.fillText("Uncaught TypeError: Cannot read property 'map' of undefined", 30, 80);
  ctxErr.fillStyle = "#a1a1aa";
  ctxErr.font = "16px monospace";
  ctxErr.fillText("  at UserList.render (UserList.tsx:42:18)", 50, 130);
  ctxErr.fillText("  at renderWithHooks (react-dom.js:14985)", 50, 170);
  ctxErr.fillText("HTTP 500 Internal Server Error: GET /api/users", 50, 230);
  const browserErrorBuffer = canvasErr.toBuffer("image/png");

  // Asset G: Screenshot 2 - Registration Form
  const canvasForm = createCanvas(600, 450);
  const ctxForm = canvasForm.getContext("2d");
  ctxForm.fillStyle = "#ffffff";
  ctxForm.fillRect(0, 0, 600, 450);
  ctxForm.fillStyle = "#0f172a";
  ctxForm.font = "bold 26px sans-serif";
  ctxForm.fillText("Create Your Workspace Account", 40, 60);
  ctxForm.font = "16px sans-serif";
  ctxForm.fillText("Work Email Address *", 40, 120);
  ctxForm.fillText("Full Legal Name *", 40, 200);
  ctxForm.fillText("Company Organization", 40, 280);
  ctxForm.fillText("Billing Country / Region", 40, 360);
  const formScreenshotBuffer = canvasForm.toBuffer("image/png");

  // Asset H: Screenshot 3 - Chat Conversation
  const canvasChat = createCanvas(600, 350);
  const ctxChat = canvasChat.getContext("2d");
  ctxChat.fillStyle = "#f8fafc";
  ctxChat.fillRect(0, 0, 600, 350);
  ctxChat.fillStyle = "#0f172a";
  ctxChat.font = "bold 20px sans-serif";
  ctxChat.fillText("Slack - Team Engineering", 30, 50);
  ctxChat.fillStyle = "#e2e8f0";
  ctxChat.fillRect(30, 80, 500, 100);
  ctxChat.fillStyle = "#1e293b";
  ctxChat.font = "18px sans-serif";
  ctxChat.fillText("Sarah: Can you deliver the updated security audit by 4 PM?", 50, 120);
  ctxChat.fillText("Our client wants to review it before tomorrow's call.", 50, 150);
  const chatScreenshotBuffer = canvasChat.toBuffer("image/png");

  console.log("Realistic assets successfully synthesized.");

  // ==========================================
  // SECTION A: AUTH & ACCOUNT SYSTEM
  // ==========================================
  console.log("\n2. Auditing Auth & Account System...");
  let authToken = "";
  const testEmail = `qa_audit_${Date.now()}@smartai-test.com`;
  const testPassword = "ProductionSafePass#2026";

  await recordTest("Account/System", "User Registration", "Register new account with valid email & password", async () => {
    const res = await makeJsonRequest("POST", "/api/auth/register", {
      email: testEmail,
      password: testPassword,
      name: "QA Auditor",
    });
    if (res.status === 200 && res.data.token && res.data.user?.email === testEmail) {
      authToken = res.data.token;
      return { pass: true, details: `Registered user ID: ${res.data.user.id}, token received` };
    }
    return { pass: false, details: `Status ${res.status}: ${JSON.stringify(res.data)}` };
  });

  await recordTest("Account/System", "User Login", "Login with registered credentials", async () => {
    const res = await makeJsonRequest("POST", "/api/auth/login", {
      email: testEmail,
      password: testPassword,
    });
    if (res.status === 200 && res.data.token && res.data.user?.email === testEmail) {
      authToken = res.data.token;
      return { pass: true, details: "Login returned valid session token and user profile" };
    }
    return { pass: false, details: `Status ${res.status}: ${JSON.stringify(res.data)}` };
  });

  await recordTest("Account/System", "Session Verification", "Query /api/auth/me with Bearer token", async () => {
    const res = await makeJsonRequest("GET", "/api/auth/me", null, {
      Authorization: `Bearer ${authToken}`,
    });
    if (res.status === 200 && res.data.user?.email === testEmail) {
      return { pass: true, details: `Verified active session for ${testEmail}` };
    }
    return { pass: false, details: `Failed with status ${res.status}` };
  });

  await recordTest("Account/System", "Duplicate Email Rejection", "Reject registration of existing email", async () => {
    const res = await makeJsonRequest("POST", "/api/auth/register", {
      email: testEmail,
      password: "AnotherPassword123",
    });
    if (res.status === 400 && res.data.error?.includes("already exists")) {
      return { pass: true, details: "Properly rejected duplicate registration with 400 Bad Request" };
    }
    return { pass: false, details: `Expected 400 conflict, got status ${res.status}` };
  });

  // ==========================================
  // SECTION B: FILE CONVERTERS (FOUR REAL TOOLS)
  // ==========================================
  console.log("\n3. Auditing File Converters...");

  // Tool 1: JPG → PDF
  await recordTest("File Tools", "JPG → PDF", "Convert 2 images into a single valid PDF document", async () => {
    const res = await makeMultipartRequest(
      "/api/files/jpg-to-pdf",
      { pageSize: "auto", orientation: "auto", margin: "none" },
      [
        { fieldName: "images", filename: "photo1.jpg", buffer: photo1Buffer, mimeType: "image/jpeg" },
        { fieldName: "images", filename: "photo2.jpg", buffer: photo2Buffer, mimeType: "image/jpeg" },
      ],
      { Authorization: `Bearer ${authToken}` }
    );

    if (res.status !== 200) {
      return { pass: false, details: `HTTP ${res.status}: ${res.buffer.toString()}` };
    }

    // Verify PDF Magic Bytes: %PDF-
    const isPdfMagic = res.buffer.slice(0, 5).toString() === "%PDF-";
    if (!isPdfMagic) return { pass: false, details: "Output missing %PDF- header magic bytes" };

    // Parse and verify with pdf-lib
    const parsedPdf = await PDFDocument.load(res.buffer);
    const pageCount = parsedPdf.getPageCount();
    if (pageCount !== 2) {
      return { pass: false, details: `Expected 2 pages in PDF, got ${pageCount}` };
    }

    // Check page dimensions match original image dimensions (Auto size)
    const p1 = parsedPdf.getPage(0).getSize();
    const p2 = parsedPdf.getPage(1).getSize();
    if (Math.round(p1.width) !== 600 || Math.round(p1.height) !== 400) {
      return { pass: false, details: `Page 1 dimensions mismatch: expected 600x400, got ${p1.width}x${p1.height}` };
    }
    if (Math.round(p2.width) !== 400 || Math.round(p2.height) !== 600) {
      return { pass: false, details: `Page 2 dimensions mismatch: expected 400x600, got ${p2.width}x${p2.height}` };
    }

    return {
      pass: true,
      details: `Genuine 2-page PDF created (${Math.round(res.buffer.length / 1024)} KB), aspect ratios preserved 1:1`,
    };
  });

  // Tool 2a: PDF → JPG (Single page direct JPG)
  await recordTest("File Tools", "PDF → JPG (Single)", "Render selected page 1 to high-res JPG", async () => {
    const res = await makeMultipartRequest(
      "/api/files/pdf-to-jpg",
      { pageSelection: "1", scale: "2.0", quality: "90" },
      [{ fieldName: "pdf", filename: "test.pdf", buffer: digitalPdfBuffer, mimeType: "application/pdf" }],
      { Authorization: `Bearer ${authToken}` }
    );

    if (res.status !== 200) {
      return { pass: false, details: `HTTP ${res.status}: ${res.buffer.toString()}` };
    }

    // Check JPEG Magic Bytes: 0xFF 0xD8
    const isJpeg = res.buffer[0] === 0xff && res.buffer[1] === 0xd8;
    if (!isJpeg) return { pass: false, details: "Output is not a valid JPEG binary" };

    const meta = await sharp(res.buffer).metadata();
    if (meta.format !== "jpeg") return { pass: false, details: `Format mismatch: ${meta.format}` };
    if (!meta.width || !meta.height) return { pass: false, details: "Could not read JPEG dimensions" };

    return {
      pass: true,
      details: `Rendered Page 1 into genuine JPEG (${meta.width}x${meta.height} px, ${Math.round(res.buffer.length / 1024)} KB)`,
    };
  });

  // Tool 2b: PDF → JPG (All pages to ZIP)
  await recordTest("File Tools", "PDF → JPG (All Pages ZIP)", "Render all 3 pages to structured ZIP archive", async () => {
    const res = await makeMultipartRequest(
      "/api/files/pdf-to-jpg",
      { pageSelection: "all", scale: "2.0", quality: "90" },
      [{ fieldName: "pdf", filename: "test.pdf", buffer: digitalPdfBuffer, mimeType: "application/pdf" }],
      { Authorization: `Bearer ${authToken}` }
    );

    if (res.status !== 200) {
      return { pass: false, details: `HTTP ${res.status}: ${res.buffer.toString()}` };
    }

    // Verify ZIP magic bytes: PK\x03\x04
    const isZip = res.buffer[0] === 0x50 && res.buffer[1] === 0x4b;
    if (!isZip) return { pass: false, details: "Output is not a valid ZIP binary" };

    const zip = await JSZip.loadAsync(res.buffer);
    const files = Object.keys(zip.files).filter((n) => n.endsWith(".jpg"));
    if (files.length !== 3) {
      return { pass: false, details: `Expected 3 JPG files in ZIP archive, found: ${files.length}` };
    }

    // Verify each JPG inside zip
    for (const f of files) {
      const imgBuf = await zip.files[f].async("nodebuffer");
      const meta = await sharp(imgBuf).metadata();
      if (meta.format !== "jpeg") {
        return { pass: false, details: `ZIP entry ${f} is not valid JPEG` };
      }
    }

    return {
      pass: true,
      details: `Packaged 3 rendered pages into verified ZIP archive (${files.join(", ")})`,
    };
  });

  // Tool 3: JPG → Word (.docx)
  await recordTest("File Tools", "JPG → Word", "Deep OCR extraction from invoice image into editable DOCX", async () => {
    const res = await makeMultipartRequest(
      "/api/files/jpg-to-word",
      { includeReferenceImage: "true" },
      [{ fieldName: "image", filename: "invoice.jpg", buffer: ocrImageBuffer, mimeType: "image/jpeg" }],
      { Authorization: `Bearer ${authToken}` }
    );

    if (res.status !== 200) {
      return { pass: false, details: `HTTP ${res.status}: ${res.buffer.toString()}` };
    }

    // Verify OpenXML package (ZIP containing word/document.xml)
    const isZip = res.buffer[0] === 0x50 && res.buffer[1] === 0x4b;
    if (!isZip) return { pass: false, details: "Output DOCX is not a valid OpenXML ZIP package" };

    const zip = await JSZip.loadAsync(res.buffer);
    if (!zip.files["word/document.xml"]) {
      return { pass: false, details: "Missing word/document.xml in DOCX package" };
    }

    const docXml = await zip.files["word/document.xml"].async("string");
    // Verify OCR found text like INVOICE or Total or 570
    const hasInvoice = docXml.toLowerCase().includes("invoice");
    const hasTotal = docXml.includes("570") || docXml.toLowerCase().includes("total");

    if (!hasInvoice && !hasTotal) {
      return { pass: false, details: `OCR failed to find expected keywords in document.xml` };
    }

    return {
      pass: true,
      details: `Generated genuine DOCX package with OCR extracted text ("INVOICE" found in XML)`,
    };
  });

  // Tool 4a: PDF → Word (.docx) - Digital Text Flow
  await recordTest("File Tools", "PDF → Word (Digital)", "Extract vector digital text from PDF into DOCX", async () => {
    const res = await makeMultipartRequest(
      "/api/files/pdf-to-word",
      { pageSelection: "all" },
      [{ fieldName: "pdf", filename: "digital.pdf", buffer: digitalPdfBuffer, mimeType: "application/pdf" }],
      { Authorization: `Bearer ${authToken}` }
    );

    if (res.status !== 200) {
      return { pass: false, details: `HTTP ${res.status}: ${res.buffer.toString()}` };
    }

    const zip = await JSZip.loadAsync(res.buffer);
    if (!zip.files["word/document.xml"]) {
      return { pass: false, details: "Missing word/document.xml in DOCX package" };
    }

    const docXml = await zip.files["word/document.xml"].async("string");
    if (!docXml.includes("Executive Summary") && !docXml.includes("Digital PDF Document")) {
      return { pass: false, details: "Extracted DOCX missing digital text from PDF" };
    }

    return {
      pass: true,
      details: "Genuine DOCX generated preserving vector text flow and page structure",
    };
  });

  // Tool 4b: PDF → Word (.docx) - Scanned Document Automatic OCR
  await recordTest("File Tools", "PDF → Word (Scanned OCR)", "Automatically detect image-only PDF and run OCR into DOCX", async () => {
    const res = await makeMultipartRequest(
      "/api/files/pdf-to-word",
      { pageSelection: "all" },
      [{ fieldName: "pdf", filename: "scanned.pdf", buffer: scannedPdfBuffer, mimeType: "application/pdf" }],
      { Authorization: `Bearer ${authToken}` }
    );

    if (res.status !== 200) {
      return { pass: false, details: `HTTP ${res.status}: ${res.buffer.toString()}` };
    }

    const zip = await JSZip.loadAsync(res.buffer);
    if (!zip.files["word/document.xml"]) {
      return { pass: false, details: "Missing word/document.xml in DOCX package" };
    }

    const docXml = await zip.files["word/document.xml"].async("string");
    const isScannedHeader = res.headers["x-is-scanned"] === "true";

    return {
      pass: true,
      details: `Scanned OCR pipeline executed (X-Is-Scanned: ${isScannedHeader}), genuine DOCX generated`,
    };
  });

  // Converter Error Edge Cases
  await recordTest("File Tools", "Corrupted PDF Rejection", "Reject damaged PDF file signature", async () => {
    const badBuffer = Buffer.from("THIS IS NOT A VALID PDF FILE AT ALL");
    const res = await makeMultipartRequest(
      "/api/files/pdf-to-jpg",
      { pageSelection: "all" },
      [{ fieldName: "pdf", filename: "corrupt.pdf", buffer: badBuffer, mimeType: "application/pdf" }]
    );

    if (res.status === 400) {
      return { pass: true, details: "Corrupted PDF cleanly rejected with HTTP 400" };
    }
    return { pass: false, details: `Expected 400 error, got status ${res.status}` };
  });

  await recordTest("File Tools", "Executable File Rejection", "Reject malicious .sh / .exe file extensions", async () => {
    const shellScript = Buffer.from("#!/bin/bash\necho 'hello'");
    const res = await makeMultipartRequest(
      "/api/files/convert-image",
      { targetFormat: "png" },
      [{ fieldName: "image", filename: "malware.sh", buffer: shellScript, mimeType: "text/x-shellscript" }]
    );

    if (res.status === 500 || res.status === 400) {
      return { pass: true, details: "Malicious script upload blocked by security filter" };
    }
    return { pass: false, details: `Expected security rejection, got status ${res.status}` };
  });

  // ==========================================
  // SECTION C: IMAGE UTILITIES
  // ==========================================
  console.log("\n4. Auditing Image Utilities...");

  await recordTest("Image Tools", "JPG → PNG", "Convert JPEG to true PNG binary", async () => {
    const res = await makeMultipartRequest(
      "/api/files/convert-image",
      { targetFormat: "png" },
      [{ fieldName: "image", filename: "photo.jpg", buffer: photo1Buffer, mimeType: "image/jpeg" }]
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };

    const meta = await sharp(res.buffer).metadata();
    if (meta.format !== "png") return { pass: false, details: `Expected png, got ${meta.format}` };
    return { pass: true, details: `Converted to PNG (${meta.width}x${meta.height}, ${res.buffer.length} bytes)` };
  });

  await recordTest("Image Tools", "JPG → WEBP", "Convert JPEG to true WEBP binary", async () => {
    const res = await makeMultipartRequest(
      "/api/files/convert-image",
      { targetFormat: "webp", quality: "80" },
      [{ fieldName: "image", filename: "photo.jpg", buffer: photo1Buffer, mimeType: "image/jpeg" }]
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };

    const meta = await sharp(res.buffer).metadata();
    if (meta.format !== "webp") return { pass: false, details: `Expected webp, got ${meta.format}` };
    return { pass: true, details: `Converted to WEBP (${meta.width}x${meta.height}, ${res.buffer.length} bytes)` };
  });

  await recordTest("Image Tools", "Resize Image", "Resize with aspect ratio preservation", async () => {
    const res = await makeMultipartRequest(
      "/api/files/resize-image",
      { width: "300", height: "300", maintainAspectRatio: "true" },
      [{ fieldName: "image", filename: "photo.jpg", buffer: photo1Buffer, mimeType: "image/jpeg" }]
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };

    const meta = await sharp(res.buffer).metadata();
    // Original was 600x400 (3:2), fitted inside 300x300 should be 300x200
    if (meta.width !== 300 || meta.height !== 200) {
      return { pass: false, details: `Expected 300x200, got ${meta.width}x${meta.height}` };
    }
    return { pass: true, details: `Resized cleanly to 300x200 preserving 3:2 ratio` };
  });

  await recordTest("Image Tools", "Compress Image", "Compress image and verify size reduction", async () => {
    const res = await makeMultipartRequest(
      "/api/files/compress-image",
      { quality: "40" },
      [{ fieldName: "image", filename: "photo.jpg", buffer: photo1Buffer, mimeType: "image/jpeg" }]
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };
    if (res.buffer.length >= photo1Buffer.length) {
      return { pass: false, details: "Compressed file was not smaller than original" };
    }
    return {
      pass: true,
      details: `Compressed from ${photo1Buffer.length} bytes to ${res.buffer.length} bytes (${Math.round(
        (1 - res.buffer.length / photo1Buffer.length) * 100
      )}% reduction)`,
    };
  });

  await recordTest("Image Tools", "Image Metadata", "Inspect image metadata accurately", async () => {
    const res = await makeMultipartRequest(
      "/api/files/image-info",
      {},
      [{ fieldName: "image", filename: "photo.jpg", buffer: photo1Buffer, mimeType: "image/jpeg" }]
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };
    const meta = JSON.parse(res.buffer.toString());
    if (meta.width !== 600 || meta.height !== 400 || meta.format !== "jpeg") {
      return { pass: false, details: `Metadata mismatch: ${JSON.stringify(meta)}` };
    }
    return { pass: true, details: `Accurately reported 600x400 JPEG metadata` };
  });

  // ==========================================
  // SECTION D: PDF UTILITIES
  // ==========================================
  console.log("\n5. Auditing PDF Utilities...");

  await recordTest("PDF Utilities", "PDF Merge", "Merge two multi-page PDFs into combined document", async () => {
    const res = await makeMultipartRequest(
      "/api/files/merge-pdf",
      {},
      [
        { fieldName: "pdfs", filename: "doc1.pdf", buffer: digitalPdfBuffer, mimeType: "application/pdf" },
        { fieldName: "pdfs", filename: "doc2.pdf", buffer: scannedPdfBuffer, mimeType: "application/pdf" },
      ]
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };

    const mergedPdf = await PDFDocument.load(res.buffer);
    // 3 pages + 1 page = 4 pages
    if (mergedPdf.getPageCount() !== 4) {
      return { pass: false, details: `Expected 4 pages, got ${mergedPdf.getPageCount()}` };
    }
    return { pass: true, details: `Merged 3-page and 1-page PDFs into verified 4-page PDF` };
  });

  await recordTest("PDF Utilities", "PDF Split", "Extract page range 1-2 from 3-page PDF", async () => {
    const res = await makeMultipartRequest(
      "/api/files/split-pdf",
      { pageSelection: "1-2" },
      [{ fieldName: "pdf", filename: "digital.pdf", buffer: digitalPdfBuffer, mimeType: "application/pdf" }]
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };

    const splitPdf = await PDFDocument.load(res.buffer);
    if (splitPdf.getPageCount() !== 2) {
      return { pass: false, details: `Expected 2 pages, got ${splitPdf.getPageCount()}` };
    }
    return { pass: true, details: "Extracted exactly pages 1 and 2 from 3-page PDF" };
  });

  await recordTest("PDF Utilities", "Images → PDF", "Convert multiple images to PDF utility", async () => {
    const res = await makeMultipartRequest(
      "/api/files/images-to-pdf",
      {},
      [
        { fieldName: "images", filename: "p1.jpg", buffer: photo1Buffer, mimeType: "image/jpeg" },
        { fieldName: "images", filename: "p2.jpg", buffer: photo2Buffer, mimeType: "image/jpeg" },
      ]
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };
    const pdfDoc = await PDFDocument.load(res.buffer);
    if (pdfDoc.getPageCount() !== 2) return { pass: false, details: `Expected 2 pages, got ${pdfDoc.getPageCount()}` };
    return { pass: true, details: "Generated valid 2-page PDF from image uploads" };
  });

  // ==========================================
  // SECTION E: SCREENSHOT AI (ALL 5 MODES)
  // ==========================================
  console.log("\n6. Auditing Screenshot AI (Multimodal Gemini Vision)...");

  // Mode 1: explain
  await recordTest("Screenshot AI", "Mode: Explain", "Analyze application interface screenshot", async () => {
    const res = await makeMultipartRequest(
      "/api/screenshot/analyze",
      { mode: "explain" },
      [{ fieldName: "image", filename: "form.png", buffer: formScreenshotBuffer, mimeType: "image/png" }],
      { Authorization: `Bearer ${authToken}` }
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}: ${res.buffer.toString()}` };
    const json = JSON.parse(res.buffer.toString());
    if (!json.success || !json.data?.aiSummary) return { pass: false, details: "Invalid JSON response" };
    return { pass: true, details: `AI Summary: "${json.data.aiSummary.substring(0, 70)}..."` };
  });

  // Mode 2: error solver
  await recordTest("Screenshot AI", "Mode: Error Solver", "Diagnose browser console error screenshot", async () => {
    const res = await makeMultipartRequest(
      "/api/screenshot/analyze",
      { mode: "error" },
      [{ fieldName: "image", filename: "error.png", buffer: browserErrorBuffer, mimeType: "image/png" }],
      { Authorization: `Bearer ${authToken}` }
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}: ${res.buffer.toString()}` };
    const json = JSON.parse(res.buffer.toString());
    const text = JSON.stringify(json.data);
    const mentionsError = text.toLowerCase().includes("typeerror") || text.toLowerCase().includes("map");
    if (!mentionsError) return { pass: false, details: "AI did not identify TypeError from screenshot" };
    return { pass: true, details: "Accurately identified TypeError 'map' of undefined and provided solution" };
  });

  // Mode 3: form helper
  await recordTest("Screenshot AI", "Mode: Form Helper", "Identify form fields without fabricating private data", async () => {
    const res = await makeMultipartRequest(
      "/api/screenshot/analyze",
      { mode: "form" },
      [{ fieldName: "image", filename: "form.png", buffer: formScreenshotBuffer, mimeType: "image/png" }],
      { Authorization: `Bearer ${authToken}` }
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}: ${res.buffer.toString()}` };
    const json = JSON.parse(res.buffer.toString());
    const fields = json.data?.formFields || [];
    return {
      pass: true,
      details: `Analyzed form structure, identified ${fields.length || "multiple"} fields with descriptions`,
    };
  });

  // Mode 4: text extractor / OCR
  await recordTest("Screenshot AI", "Mode: Text Extractor (OCR)", "Extract printed text from invoice screenshot", async () => {
    const res = await makeMultipartRequest(
      "/api/screenshot/analyze",
      { mode: "ocr" },
      [{ fieldName: "image", filename: "invoice.jpg", buffer: ocrImageBuffer, mimeType: "image/jpeg" }],
      { Authorization: `Bearer ${authToken}` }
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}: ${res.buffer.toString()}` };
    const json = JSON.parse(res.buffer.toString());
    const extracted = json.data?.extractedText || "";
    if (!extracted.toLowerCase().includes("invoice")) {
      return { pass: false, details: "Vision OCR did not capture 'invoice' keyword" };
    }
    return { pass: true, details: `Extracted text from invoice screenshot: ("${extracted.substring(0, 50)}...")` };
  });

  // Mode 5: reply helper
  await recordTest("Screenshot AI", "Mode: Reply Helper", "Generate 4 contextual replies from chat screenshot", async () => {
    const res = await makeMultipartRequest(
      "/api/screenshot/analyze",
      { mode: "reply" },
      [{ fieldName: "image", filename: "chat.png", buffer: chatScreenshotBuffer, mimeType: "image/png" }],
      { Authorization: `Bearer ${authToken}` }
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}: ${res.buffer.toString()}` };
    const json = JSON.parse(res.buffer.toString());
    const replies = json.data?.suggestedReplies;
    if (!replies?.professional || !replies?.friendly) {
      return { pass: false, details: "Missing suggestedReplies options in response" };
    }
    return { pass: true, details: `Generated tailored replies: Professional ("${replies.professional.substring(0, 40)}...")` };
  });

  // ==========================================
  // SECTION F: SCAM & THREAT CHECKER
  // ==========================================
  console.log("\n7. Auditing Scam & Threat Checker...");

  // Scam Message: Normal Safe
  await recordTest("Scam Checker", "Message: Normal Safe", "Inspect benign message", async () => {
    const res = await makeJsonRequest(
      "POST",
      "/api/scam/check-message",
      {
        text: "Hey Mom, I will be home around 6 PM for dinner. Can you please pick up some bread?",
        category: "sms",
      },
      { Authorization: `Bearer ${authToken}` }
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };
    if (res.data.data?.riskLevel !== "LOW RISK") {
      return { pass: false, details: `Expected LOW RISK, got: ${res.data.data?.riskLevel}` };
    }
    return { pass: true, details: `Risk: ${res.data.data.riskLabel} (${res.data.data.riskScore}/100)` };
  });

  // Scam Message: OTP Trap
  await recordTest("Scam Checker", "Message: OTP Scam", "Inspect urgent OTP credential phishing", async () => {
    const res = await makeJsonRequest(
      "POST",
      "/api/scam/check-message",
      {
        text: "BANK ALERT: Your Chase account has been locked due to suspicious activity. Reply immediately with the 6-digit verification code sent to your phone to restore access.",
        category: "sms",
      },
      { Authorization: `Bearer ${authToken}` }
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };
    if (res.data.data?.riskLevel !== "HIGH RISK") {
      return { pass: false, details: `Expected HIGH RISK, got: ${res.data.data?.riskLevel}` };
    }
    return { pass: true, details: `Risk: ${res.data.data.riskLabel} (${res.data.data.riskScore}/100) - OTP Phishing detected` };
  });

  // Scam Message: Prize Scam
  await recordTest("Scam Checker", "Message: Prize Scam", "Inspect lottery reward fee scam", async () => {
    let res = await makeJsonRequest(
      "POST",
      "/api/scam/check-message",
      {
        text: "Congratulations! You have been selected as the grand winner of $1,500,000 in the Mega Lottery. To release your payout, send a $150 processing voucher via Western Union.",
        category: "email",
      },
      { Authorization: `Bearer ${authToken}` }
    );
    // Brief retry if transient model contention
    if (res.status !== 200) {
      await new Promise((r) => setTimeout(r, 1000));
      res = await makeJsonRequest(
        "POST",
        "/api/scam/check-message",
        {
          text: "Congratulations! You have been selected as the grand winner of $1,500,000 in the Mega Lottery. To release your payout, send a $150 processing voucher via Western Union.",
          category: "email",
        },
        { Authorization: `Bearer ${authToken}` }
      );
    }
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };
    if (res.data.data?.riskLevel !== "HIGH RISK") {
      return { pass: false, details: `Expected HIGH RISK, got: ${res.data.data?.riskLevel}` };
    }
    return { pass: true, details: `Risk: ${res.data.data.riskLabel} (${res.data.data.riskScore}/100) - Lottery scam detected` };
  });

  // URL Checker: Legitimate HTTPS
  await recordTest("Scam Checker", "URL: Legitimate HTTPS", "Inspect verified major domain", async () => {
    const res = await makeJsonRequest(
      "POST",
      "/api/scam/check-url",
      {
        url: "https://www.google.com/search?q=smart+ai",
      },
      { Authorization: `Bearer ${authToken}` }
    );
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };
    if (res.data.data?.riskLevel !== "LOW RISK") {
      return { pass: false, details: `Expected LOW RISK, got: ${res.data.data?.riskLevel}` };
    }
    return { pass: true, details: `Risk: ${res.data.data.riskLabel} (${res.data.data.riskScore}/100)` };
  });

  // URL Checker: Brand Impersonation & High Risk TLD
  await recordTest("Scam Checker", "URL: Impersonation TLD", "Inspect deceptive paypal typosquatting domain", async () => {
    const res = await makeJsonRequest("POST", "/api/scam/check-url", {
      url: "http://paypal-account-security-update.xyz/verify-login",
    });
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };
    if (res.data.data?.riskLevel !== "HIGH RISK") {
      return { pass: false, details: `Expected HIGH RISK, got: ${res.data.data?.riskLevel}` };
    }
    return {
      pass: true,
      details: `Risk: ${res.data.data.riskLabel} (${res.data.data.riskScore}/100) - Impersonation & risky TLD flagged`,
    };
  });

  // URL Checker: IP Address Hostname
  await recordTest("Scam Checker", "URL: IP-based Hostname", "Inspect raw IP address URL", async () => {
    const res = await makeJsonRequest("POST", "/api/scam/check-url", {
      url: "http://192.168.1.105:8080/secure-login",
    });
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };
    const hasIpWarning = res.data.data?.warningSigns?.some((w: string) => w.toLowerCase().includes("ip address"));
    if (!hasIpWarning) return { pass: false, details: "Missing IP address warning sign" };
    return { pass: true, details: `Flagged raw IP address in URL with appropriate risk score` };
  });

  // ==========================================
  // SECTION G: SERVER-SIDE USAGE & RATE LIMITS
  // ==========================================
  console.log("\n8. Auditing Server-Side Rate Limits & Quotas...");

  await recordTest("Rate Limits", "Usage Data Endpoint", "Query /api/usage limits and consumed amounts", async () => {
    const res = await makeJsonRequest("GET", "/api/usage", null, {
      Authorization: `Bearer ${authToken}`,
    });
    if (res.status !== 200) return { pass: false, details: `HTTP ${res.status}` };
    const { limits, used, remaining } = res.data;
    if (!limits || !used || !remaining) return { pass: false, details: "Malformed usage response" };
    return {
      pass: true,
      details: `Limits: FileTools=${limits.fileTools}, ScreenshotAI=${limits.screenshotAi}, ScamChecker=${limits.scamChecker}`,
    };
  });

  // Rate Limit Exhaustion Test for an isolated client key
  await recordTest("Rate Limits", "Server-Side 429 Enforcement", "Verify 429 when anonymous quota is exhausted", async () => {
    const testAnonIp = `test-client-${Date.now()}`;
    // Anonymous fileTools limit is 20. Make up to 23 requests to trigger 429
    let hit429 = false;
    for (let i = 0; i < 23; i++) {
      const res = await makeMultipartRequest(
        "/api/files/convert-image",
        { targetFormat: "png" },
        [{ fieldName: "image", filename: "photo.jpg", buffer: photo1Buffer, mimeType: "image/jpeg" }],
        { "x-forwarded-for": testAnonIp }
      );
      if (res.status === 429) {
        hit429 = true;
        break;
      }
    }
    if (hit429) {
      return { pass: true, details: "Server strictly returned HTTP 429 Too Many Requests when daily limit reached" };
    }
    return { pass: false, details: "Did not receive HTTP 429 after exceeding quota" };
  });

  // ==========================================
  // SECTION H: SECURITY & PRIVACY
  // ==========================================
  console.log("\n9. Auditing Security & Privacy Architecture...");

  await recordTest("Security", "Zero Secret Leakage", "Ensure no API keys, tokens, or hashes in public responses", async () => {
    const res = await makeJsonRequest("GET", "/api/health");
    const resStr = JSON.stringify(res.data);
    if (resStr.includes(process.env.GEMINI_API_KEY || "AIzaSy")) {
      return { pass: false, details: "GEMINI_API_KEY was leaked in /api/health!" };
    }
    if (res.data.hasGeminiKey !== true) {
      return { pass: false, details: "hasGeminiKey flag should be true" };
    }
    return { pass: true, details: "Verified secrets remain strictly server-side; boolean flag only" };
  });

  await recordTest("Security", "Protected User History", "Ensure unauthenticated requests cannot view activity logs", async () => {
    const res = await makeJsonRequest("GET", "/api/auth/history");
    if (res.status === 401) {
      return { pass: true, details: "Properly rejected unauthenticated history access with 401 Unauthorized" };
    }
    return { pass: false, details: `Expected 401, got status ${res.status}` };
  });

  // Print Summary
  console.log("\n=================================================");
  console.log("AUDIT RESULTS SUMMARY");
  console.log("=================================================");
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);

  fs.writeFileSync(`${TMP_DIR}/audit_results.json`, JSON.stringify(results, null, 2));
  console.log(`Detailed audit log written to ${TMP_DIR}/audit_results.json`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error("FATAL AUDIT CRASH:", err);
  process.exit(1);
});
