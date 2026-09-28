import express, { Request, Response, NextFunction } from "express";
import path from "path";
import multer from "multer";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { APP_LIMITS } from "./server/config";
import {
  registerUser,
  loginUser,
  getUserByToken,
  logoutUser,
  logActivity,
  getUserActivity,
} from "./server/services/authService";
import {
  checkAndConsumeUsage,
  getCurrentUsage,
  FeatureKey,
} from "./server/services/usageTracker";
import {
  analyzeScreenshot,
  ScreenshotMode,
} from "./server/services/screenshotAI";
import {
  analyzeScamMessage,
} from "./server/services/scamChecker";
import {
  analyzeUrlSecurity,
} from "./server/services/urlSecurity";
import {
  convertImage,
  resizeImage,
  compressImage,
  getImageMetadata,
  mergePdfs,
  splitPdf,
  compressPdf,
  imagesToPdf,
  convertJpgToPdf,
  convertPdfToJpg,
  convertJpgToWord,
  convertPdfToWord,
} from "./server/services/fileService";
import {
  removeImageBackground,
  replaceImageBackground,
  normalizeColor,
  releaseBackgroundJob,
} from "./server/services/backgroundRemovalService";
import { refundUsage } from "./server/services/usageTracker";
import fs from "fs";
import {
  handleRobotsTxt,
  handleSitemapXml,
  renderPageWithSeo,
  render404Page,
  getBaseUrl,
} from "./server/seoEngine";
import { handleSeoDiagnosticsApi } from "./server/seoDiagnostics";
import { SEO_PAGES } from "./src/lib/seoData";

dotenv.config();

const app = express();
const PORT = process.env.DEFAULT_APP_PORT
  ? parseInt(process.env.DEFAULT_APP_PORT, 10)
  : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

// Production CORS middleware for Cloudflare Pages and cross-origin clients
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    const publicSiteUrl = process.env.PUBLIC_SITE_URL ? process.env.PUBLIC_SITE_URL.replace(/\/+$/, "") : "";
    const isAllowed =
      !publicSiteUrl ||
      origin === publicSiteUrl ||
      origin.endsWith(".pages.dev") ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("run.app");

    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, HEAD"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, Range, Accept"
      );
      res.setHeader(
        "Access-Control-Expose-Headers",
        "Content-Disposition, Content-Type, Content-Length, X-Original-Size, X-Output-Size, X-Page-Count, X-Word-Count, X-Job-Id, X-Reduction-Percent, X-Width, X-Height, X-Has-Alpha, X-Confidence, X-Is-Scanned, X-Is-Zip"
      );
    }
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Increase payload limits for image uploads
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

// Configure multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: APP_LIMITS.maxUploadSizeMb * 1024 * 1024, // 15MB
  },
  fileFilter: (req, file, cb) => {
    // Prohibit executable and dangerous files
    const dangerousExts = [
      ".exe",
      ".sh",
      ".bat",
      ".cmd",
      ".msi",
      ".bin",
      ".com",
      ".vbs",
      ".ps1",
      ".jar",
      ".app",
      ".scr",
      ".pif",
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (dangerousExts.includes(ext)) {
      return cb(new Error("Executable and script files are strictly prohibited for security reasons."));
    }
    cb(null, true);
  },
});

// Helper to extract client identifier and authenticated user
function getClientContext(req: Request): {
  clientKey: string;
  user: ReturnType<typeof getUserByToken>;
  isAuthenticated: boolean;
} {
  const authHeader = req.headers.authorization;
  let token = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  const user = token ? getUserByToken(token) : null;
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "anonymous-client";

  const clientKey = user ? `user:${user.id}` : `ip:${ip}`;
  return {
    clientKey,
    user,
    isAuthenticated: !!user,
  };
}

// ==========================================
// 1. SYSTEM & AUTH ROUTES
// ==========================================

app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "Smart AI",
    version: "1.0.0",
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
  });
});

app.post("/api/auth/register", (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const result = registerUser(email, password, name || "");
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Registration failed." });
  }
});

app.post("/api/auth/login", (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const result = loginUser(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || "Login failed." });
  }
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    logoutUser(token);
  }
  res.json({ success: true });
});

app.get("/api/auth/me", (req: Request, res: Response) => {
  const { user } = getClientContext(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  res.json({ user });
});

app.get("/api/auth/history", (req: Request, res: Response) => {
  const { user } = getClientContext(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required to view history." });
  }
  const logs = getUserActivity(user.id);
  res.json({ logs });
});

app.get("/api/usage", (req: Request, res: Response) => {
  const { clientKey, isAuthenticated } = getClientContext(req);
  const usage = getCurrentUsage(clientKey, isAuthenticated);
  res.json(usage);
});

// ==========================================
// 2. SCREENSHOT AI API
// ==========================================

app.post(
  "/api/screenshot/analyze",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      const { clientKey, user, isAuthenticated } = getClientContext(req);

      // Check and consume usage limit
      const usageCheck = checkAndConsumeUsage(clientKey, "screenshotAi", isAuthenticated);
      if (!usageCheck.allowed) {
        return res.status(429).json({
          error: "You’ve reached today’s free limit. Please try again later.",
          limitReached: true,
          feature: "screenshotAi",
          total: usageCheck.total,
        });
      }

      let base64Data = "";
      let mimeType = "image/png";

      if (req.file) {
        base64Data = req.file.buffer.toString("base64");
        mimeType = req.file.mimetype;
      } else if (req.body.imageBase64) {
        const raw = req.body.imageBase64;
        if (raw.includes(",")) {
          const parts = raw.split(",");
          base64Data = parts[1];
          const match = parts[0].match(/:(.*?);/);
          if (match) mimeType = match[1];
        } else {
          base64Data = raw;
        }
      }

      if (!base64Data) {
        return res.status(400).json({ error: "Please upload or provide an image to analyze." });
      }

      const mode = (req.body.mode as ScreenshotMode) || "explain";
      const validModes: ScreenshotMode[] = ["explain", "error", "form", "ocr", "reply"];
      const finalMode = validModes.includes(mode) ? mode : "explain";

      const analysis = await analyzeScreenshot(base64Data, mimeType, finalMode);

      // Log activity
      logActivity({
        userId: user?.id,
        feature: "screenshot_ai",
        action: `Analyze (${finalMode})`,
        details: analysis.aiSummary.substring(0, 100),
      });

      res.json({
        success: true,
        data: analysis,
        usage: {
          remaining: usageCheck.remaining,
          total: usageCheck.total,
        },
      });
    } catch (err: any) {
      console.error("Screenshot AI error:", err);
      res.status(500).json({
        error: "Smart AI could not complete this request right now. Please try again.",
        details: err.message,
      });
    }
  }
);

// ==========================================
// 3. SCAM CHECKER API
// ==========================================

app.post("/api/scam/check-message", async (req: Request, res: Response) => {
  try {
    const { clientKey, user, isAuthenticated } = getClientContext(req);
    const { text, category } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Please provide a message or text to inspect." });
    }

    if (text.trim().length > 10000) {
      return res.status(400).json({ error: "Message exceeds maximum length (10,000 characters)." });
    }

    const usageCheck = checkAndConsumeUsage(clientKey, "scamChecker", isAuthenticated);
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: "You’ve reached today’s free limit. Please try again later.",
        limitReached: true,
        feature: "scamChecker",
        total: usageCheck.total,
      });
    }

    const result = await analyzeScamMessage(text.trim(), category);

    logActivity({
      userId: user?.id,
      feature: "scam_checker",
      action: "Check Message",
      details: `${result.riskLabel} (${result.riskScore}/100) - ${result.summary.substring(0, 80)}`,
    });

    res.json({
      success: true,
      data: result,
      usage: {
        remaining: usageCheck.remaining,
        total: usageCheck.total,
      },
    });
  } catch (err: any) {
    console.error("Scam message check error:", err);
    res.status(500).json({
      error: "Smart AI could not complete this request right now. Please try again.",
      details: err.message,
    });
  }
});

app.post("/api/scam/check-url", async (req: Request, res: Response) => {
  try {
    const { clientKey, user, isAuthenticated } = getClientContext(req);
    const { url } = req.body;

    if (!url || typeof url !== "string" || url.trim().length === 0) {
      return res.status(400).json({ error: "Please provide a website URL to evaluate." });
    }

    const usageCheck = checkAndConsumeUsage(clientKey, "scamChecker", isAuthenticated);
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: "You’ve reached today’s free limit. Please try again later.",
        limitReached: true,
        feature: "scamChecker",
        total: usageCheck.total,
      });
    }

    const result = await analyzeUrlSecurity(url.trim());

    logActivity({
      userId: user?.id,
      feature: "scam_checker",
      action: "Check URL",
      details: `${result.riskLabel} for ${result.domain}`,
    });

    res.json({
      success: true,
      data: result,
      usage: {
        remaining: usageCheck.remaining,
        total: usageCheck.total,
      },
    });
  } catch (err: any) {
    console.error("URL Security check error:", err);
    res.status(400).json({
      error: err.message || "Smart AI could not evaluate this URL. Please verify the web address.",
    });
  }
});

// ==========================================
// 4. FILE TOOLS API (REAL CONVERSIONS)
// ==========================================

// Helper middleware for file operations quota
function checkFileQuota(req: Request, res: Response, next: NextFunction) {
  const { clientKey, isAuthenticated } = getClientContext(req);
  const check = checkAndConsumeUsage(clientKey, "fileTools", isAuthenticated);
  if (!check.allowed) {
    return res.status(429).json({
      error: "You’ve reached today’s free limit. Please try again later.",
      limitReached: true,
      feature: "fileTools",
      total: check.total,
    });
  }
  (req as any).fileQuota = check;
  next();
}

// Convert Image Format
app.post(
  "/api/files/convert-image",
  upload.single("image"),
  checkFileQuota,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Please upload an image file." });
      }

      const targetFormat = req.body.targetFormat as "jpeg" | "png" | "webp";
      const quality = req.body.quality ? parseInt(req.body.quality, 10) : 85;

      if (!["jpeg", "png", "webp"].includes(targetFormat)) {
        return res.status(400).json({ error: "Supported target formats are: jpeg, png, webp." });
      }

      const result = await convertImage(req.file.buffer, targetFormat, { quality });

      const { user } = getClientContext(req);
      logActivity({
        userId: user?.id,
        feature: "file_tools",
        action: `Convert Image to ${targetFormat.toUpperCase()}`,
        details: `${req.file.originalname} (${Math.round(req.file.size / 1024)} KB) → (${Math.round(result.outputSize / 1024)} KB)`,
      });

      res.setHeader("Content-Type", result.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("X-Original-Size", result.originalSize.toString());
      res.setHeader("X-Output-Size", result.outputSize.toString());
      res.send(result.data);
    } catch (err: any) {
      console.error("Convert image error:", err);
      res.status(500).json({ error: err.message || "Failed to convert image." });
    }
  }
);

// Resize Image
app.post(
  "/api/files/resize-image",
  upload.single("image"),
  checkFileQuota,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Please upload an image file." });
      }

      const width = req.body.width ? parseInt(req.body.width, 10) : undefined;
      const height = req.body.height ? parseInt(req.body.height, 10) : undefined;
      const maintainAspectRatio = req.body.maintainAspectRatio !== "false";

      if (!width && !height) {
        return res.status(400).json({ error: "Please specify target width or height." });
      }

      const result = await resizeImage(req.file.buffer, {
        width,
        height,
        maintainAspectRatio,
      });

      const { user } = getClientContext(req);
      logActivity({
        userId: user?.id,
        feature: "file_tools",
        action: "Resize Image",
        details: `${req.file.originalname} resized to ${result.details?.newDimensions}`,
      });

      res.setHeader("Content-Type", result.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("X-Original-Size", result.originalSize.toString());
      res.setHeader("X-Output-Size", result.outputSize.toString());
      res.send(result.data);
    } catch (err: any) {
      console.error("Resize image error:", err);
      res.status(500).json({ error: err.message || "Failed to resize image." });
    }
  }
);

// Compress Image
app.post(
  "/api/files/compress-image",
  upload.single("image"),
  checkFileQuota,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Please upload an image file." });
      }

      const quality = req.body.quality ? parseInt(req.body.quality, 10) : 75;
      const result = await compressImage(req.file.buffer, quality);

      const { user } = getClientContext(req);
      logActivity({
        userId: user?.id,
        feature: "file_tools",
        action: "Compress Image",
        details: `${req.file.originalname}: saved ${result.reductionPercentage}%`,
      });

      res.setHeader("Content-Type", result.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("X-Original-Size", result.originalSize.toString());
      res.setHeader("X-Output-Size", result.outputSize.toString());
      res.setHeader("X-Reduction-Percent", (result.reductionPercentage || 0).toString());
      res.send(result.data);
    } catch (err: any) {
      console.error("Compress image error:", err);
      res.status(500).json({ error: err.message || "Failed to compress image." });
    }
  }
);

// Image Info
app.post(
  "/api/files/image-info",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Please upload an image file." });
      }

      const meta = await getImageMetadata(req.file.buffer);
      res.json({
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        ...meta,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to inspect image." });
    }
  }
);

// Merge PDF
app.post(
  "/api/files/merge-pdf",
  upload.array("pdfs", 10),
  checkFileQuota,
  async (req: Request, res: Response) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length < 2) {
        return res.status(400).json({ error: "Please upload at least 2 PDF files to merge." });
      }

      const pdfPayload = files.map((f) => ({ buffer: f.buffer, name: f.originalname }));
      const result = await mergePdfs(pdfPayload);

      const { user } = getClientContext(req);
      logActivity({
        userId: user?.id,
        feature: "file_tools",
        action: "Merge PDF",
        details: `Combined ${files.length} PDFs into 1 (${result.details?.totalPages} pages)`,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("X-Original-Size", result.originalSize.toString());
      res.setHeader("X-Output-Size", result.outputSize.toString());
      res.send(result.data);
    } catch (err: any) {
      console.error("Merge PDF error:", err);
      res.status(500).json({ error: err.message || "Failed to merge PDF files." });
    }
  }
);

// Split PDF
app.post(
  "/api/files/split-pdf",
  upload.single("pdf"),
  checkFileQuota,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Please upload a PDF file." });
      }

      const pageSelection = (req.body.pageSelection as string) || "1";
      const result = await splitPdf(req.file.buffer, pageSelection);

      const { user } = getClientContext(req);
      logActivity({
        userId: user?.id,
        feature: "file_tools",
        action: "Split PDF",
        details: `Extracted pages ${result.details?.extractedPages?.join(", ")} from ${req.file.originalname}`,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("X-Original-Size", result.originalSize.toString());
      res.setHeader("X-Output-Size", result.outputSize.toString());
      res.send(result.data);
    } catch (err: any) {
      console.error("Split PDF error:", err);
      res.status(500).json({ error: err.message || "Failed to split PDF." });
    }
  }
);

// Compress PDF
app.post(
  "/api/files/compress-pdf",
  upload.single("pdf"),
  checkFileQuota,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Please upload a PDF file." });
      }

      const result = await compressPdf(req.file.buffer);

      const { user } = getClientContext(req);
      logActivity({
        userId: user?.id,
        feature: "file_tools",
        action: "Compress PDF",
        details: `${req.file.originalname}: saved ${result.reductionPercentage}%`,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("X-Original-Size", result.originalSize.toString());
      res.setHeader("X-Output-Size", result.outputSize.toString());
      res.setHeader("X-Reduction-Percent", (result.reductionPercentage || 0).toString());
      res.send(result.data);
    } catch (err: any) {
      console.error("Compress PDF error:", err);
      res.status(500).json({ error: err.message || "Failed to compress PDF." });
    }
  }
);

// Images to PDF
app.post(
  "/api/files/images-to-pdf",
  upload.array("images", 20),
  checkFileQuota,
  async (req: Request, res: Response) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        return res.status(400).json({ error: "Please upload at least 1 image." });
      }

      const imagePayload = files.map((f) => ({
        buffer: f.buffer,
        mimeType: f.mimetype,
        name: f.originalname,
      }));

      const result = await imagesToPdf(imagePayload);

      const { user } = getClientContext(req);
      logActivity({
        userId: user?.id,
        feature: "file_tools",
        action: "Images to PDF",
        details: `Converted ${files.length} images into a PDF document`,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("X-Original-Size", result.originalSize.toString());
      res.setHeader("X-Output-Size", result.outputSize.toString());
      res.send(result.data);
    } catch (err: any) {
      console.error("Images to PDF error:", err);
      res.status(500).json({ error: err.message || "Failed to convert images to PDF." });
    }
  }
);

// 1. Featured Tool: JPG → PDF
app.post(
  "/api/files/jpg-to-pdf",
  upload.array("images", 30),
  checkFileQuota,
  async (req: Request, res: Response) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        return res.status(400).json({ error: "Please upload at least 1 JPG image." });
      }

      const pageSize = (req.body.pageSize as "auto" | "a4" | "letter") || "auto";
      const orientation = (req.body.orientation as "auto" | "portrait" | "landscape") || "auto";
      const margin = (req.body.margin as "none" | "small" | "standard") || "none";

      const payload = files.map((f) => ({
        buffer: f.buffer,
        name: f.originalname,
      }));

      const result = await convertJpgToPdf(payload, { pageSize, orientation, margin });

      const { user } = getClientContext(req);
      logActivity({
        userId: user?.id,
        feature: "file_tools",
        action: "JPG to PDF",
        details: `Converted ${files.length} image(s) to PDF (${Math.round(result.outputSize / 1024)} KB)`,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("X-Original-Size", result.originalSize.toString());
      res.setHeader("X-Output-Size", result.outputSize.toString());
      res.setHeader("X-Page-Count", (result.details?.pageCount || files.length).toString());
      res.send(result.data);
    } catch (err: any) {
      console.error("JPG to PDF error:", err);
      res.status(400).json({ error: err.message || "Failed to convert JPG to PDF." });
    }
  }
);

// 2. Featured Tool: PDF → JPG
app.post(
  "/api/files/pdf-to-jpg",
  upload.single("pdf"),
  checkFileQuota,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Please upload a valid PDF file." });
      }

      const pageSelection = (req.body.pageSelection as string) || "all";
      const scale = parseFloat(req.body.scale || "2.0");
      const quality = parseInt(req.body.quality || "90", 10);

      const result = await convertPdfToJpg(req.file.buffer, { pageSelection, scale, quality });

      const { user } = getClientContext(req);
      logActivity({
        userId: user?.id,
        feature: "file_tools",
        action: "PDF to JPG",
        details: `Converted ${result.details?.convertedPagesCount || 1} page(s) from ${req.file.originalname}`,
      });

      res.setHeader("Content-Type", result.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("X-Original-Size", result.originalSize.toString());
      res.setHeader("X-Output-Size", result.outputSize.toString());
      res.setHeader("X-Page-Count", (result.details?.convertedPagesCount || 1).toString());
      res.setHeader("X-Is-Zip", result.isZip ? "true" : "false");
      res.send(result.data);
    } catch (err: any) {
      console.error("PDF to JPG error:", err);
      res.status(400).json({ error: err.message || "Failed to convert PDF to JPG." });
    }
  }
);

// 3. Featured Tool: JPG → Word (.docx)
app.post(
  "/api/files/jpg-to-word",
  upload.single("image"),
  checkFileQuota,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Please upload an image file containing text." });
      }

      const includeReferenceImage = req.body.includeReferenceImage !== "false";
      const result = await convertJpgToWord(req.file.buffer, { includeReferenceImage });

      const { user } = getClientContext(req);
      logActivity({
        userId: user?.id,
        feature: "file_tools",
        action: "JPG to Word",
        details: `OCR extracted ${result.details?.wordCount || 0} words (${result.details?.avgConfidence}% confidence)`,
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("X-Original-Size", result.originalSize.toString());
      res.setHeader("X-Output-Size", result.outputSize.toString());
      res.setHeader("X-Word-Count", (result.details?.wordCount || 0).toString());
      res.setHeader("X-Confidence", (result.details?.avgConfidence || 0).toString());
      res.send(result.data);
    } catch (err: any) {
      console.error("JPG to Word error:", err);
      res.status(400).json({ error: err.message || "Failed to convert JPG to Word." });
    }
  }
);

// 4. Featured Tool: PDF → Word (.docx)
app.post(
  "/api/files/pdf-to-word",
  upload.single("pdf"),
  checkFileQuota,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Please upload a PDF file." });
      }

      const pageSelection = (req.body.pageSelection as string) || "all";
      const result = await convertPdfToWord(req.file.buffer, { pageSelection });

      const { user } = getClientContext(req);
      logActivity({
        userId: user?.id,
        feature: "file_tools",
        action: "PDF to Word",
        details: `Converted ${result.details?.totalPages || 1} page(s) to DOCX (${result.details?.isScanned ? "Scanned OCR" : "Digital Text"})`,
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("X-Original-Size", result.originalSize.toString());
      res.setHeader("X-Output-Size", result.outputSize.toString());
      res.setHeader("X-Word-Count", (result.details?.wordCount || 0).toString());
      res.setHeader("X-Is-Scanned", result.details?.isScanned ? "true" : "false");
      res.send(result.data);
    } catch (err: any) {
      console.error("PDF to Word error:", err);
      res.status(400).json({ error: err.message || "Failed to convert PDF to Word." });
    }
  }
);

// 5. Featured Tool: PNG → Word (.docx)
app.post(
  "/api/files/png-to-word",
  upload.single("image"),
  checkFileQuota,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Please upload a PNG image file containing text." });
      }

      const includeReferenceImage = req.body.includeReferenceImage !== "false";
      const result = await convertJpgToWord(req.file.buffer, { includeReferenceImage });

      const { user } = getClientContext(req);
      logActivity({
        userId: user?.id,
        feature: "file_tools",
        action: "PNG to Word",
        details: `OCR extracted ${result.details?.wordCount || 0} words (${result.details?.avgConfidence}% confidence)`,
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename.replace(/\.jpg|\.jpeg/i, "")}"`);
      res.setHeader("X-Original-Size", result.originalSize.toString());
      res.setHeader("X-Output-Size", result.outputSize.toString());
      res.setHeader("X-Word-Count", (result.details?.wordCount || 0).toString());
      res.setHeader("X-Confidence", (result.details?.avgConfidence || 0).toString());
      res.send(result.data);
    } catch (err: any) {
      console.error("PNG to Word error:", err);
      res.status(400).json({ error: err.message || "Failed to convert PNG to Word." });
    }
  }
);

// ==========================================
// 4B. AI BACKGROUND REMOVER & REPLACEMENT
// ==========================================

// Remove background
app.post(
  "/api/background/remove",
  upload.single("image"),
  checkFileQuota,
  async (req: Request, res: Response) => {
    const { clientKey, user } = getClientContext(req);
    try {
      if (!req.file) {
        refundUsage(clientKey, "fileTools");
        return res.status(400).json({ error: "Please upload an image file (JPG, PNG, or WEBP)." });
      }

      const resolution = (req.body.resolution || req.query.resolution || "original") as
        | "original"
        | "hd"
        | "4k";
      const format = (req.body.format || req.query.format || "png") as "png" | "webp";
      const edgeMode = (req.body.edgeMode || req.query.edgeMode || "standard") as
        | "standard"
        | "crisp"
        | "soft";
      const isDownload = req.body.download === "true" || req.query.download === "true";

      const result = await removeImageBackground(req.file.buffer, {
        resolution,
        format,
        edgeMode,
      });

      logActivity({
        userId: user?.id,
        feature: "file_tools",
        action: "AI Background Removal",
        details: `Removed background from ${req.file.originalname} (${result.width}x${result.height}, ${result.resolutionMode})`,
      });

      if (isDownload) {
        res.setHeader("Content-Type", result.mimeType);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="smart-ai-transparent-${Date.now()}.${result.format}"`
        );
        res.setHeader("X-Width", result.width.toString());
        res.setHeader("X-Height", result.height.toString());
        res.setHeader("X-Has-Alpha", result.hasAlpha ? "true" : "false");
        res.setHeader("X-Original-Size", result.originalSize.toString());
        res.setHeader("X-Output-Size", result.outputSize.toString());
        return res.send(result.buffer);
      }

      res.json({
        success: true,
        jobId: result.jobId,
        base64: `data:${result.mimeType};base64,${result.buffer.toString("base64")}`,
        width: result.width,
        height: result.height,
        originalWidth: result.originalWidth,
        originalHeight: result.originalHeight,
        originalSize: result.originalSize,
        outputSize: result.outputSize,
        hasAlpha: result.hasAlpha,
        format: result.format,
        resolutionMode: result.resolutionMode,
        edgeMode: result.edgeMode,
      });
    } catch (err: any) {
      refundUsage(clientKey, "fileTools");
      console.error("Background removal error:", err);
      res.status(400).json({ error: err.message || "Failed to remove background from image." });
    }
  }
);

// Ultra-fast Background Re-composition using cached segmentation mask (~30-80ms)
// Does NOT re-run neural network or deduct daily credits for simple color/background adjustments.
app.post(
  "/api/background/recomposite",
  upload.fields([
    { name: "customBackground", maxCount: 1 },
    { name: "foreground", maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const customBgFile = files?.customBackground?.[0];
      const foregroundFile = files?.foreground?.[0];

      const rawJobId = (req.body.jobId || req.query.jobId) as string | undefined;
      const jobId = rawJobId && rawJobId.trim() !== "" ? rawJobId.trim() : undefined;

      const backgroundType = (req.body.backgroundType || "color") as
        | "transparent"
        | "color"
        | "custom_image";
      const backgroundColor = req.body.backgroundColor || "#ffffff";
      const resolution = (req.body.resolution || "original") as "original" | "hd" | "4k";
      const outputFormat = (req.body.outputFormat || "png") as "png" | "jpg" | "webp";
      const isDownload = req.body.download === "true" || req.query.download === "true";

      let foregroundBuffer = foregroundFile?.buffer;
      if (!foregroundBuffer && typeof req.body.foregroundBase64 === "string" && req.body.foregroundBase64.length > 50) {
        try {
          const base64Clean = req.body.foregroundBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
          foregroundBuffer = Buffer.from(base64Clean, "base64");
        } catch (e) {
          console.warn("Failed to parse foregroundBase64:", e);
        }
      }

      if (!jobId && !foregroundBuffer) {
        return res.status(400).json({
          error: "No active segmentation session or image provided. Please allow background removal to complete or upload an image.",
        });
      }

      const result = await replaceImageBackground({
        jobId,
        foregroundBuffer,
        backgroundType,
        backgroundColor,
        customBackgroundBuffer: customBgFile?.buffer,
        resolution,
        outputFormat,
      });

      if (isDownload) {
        res.setHeader("Content-Type", result.mimeType);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="smart-ai-bg-${backgroundType}-${Date.now()}.${result.format}"`
        );
        res.setHeader("X-Width", result.width.toString());
        res.setHeader("X-Height", result.height.toString());
        res.setHeader("X-Output-Size", result.size.toString());
        return res.send(result.buffer);
      }

      res.json({
        success: true,
        jobId: result.jobId || jobId,
        base64: `data:${result.mimeType};base64,${result.buffer.toString("base64")}`,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.size,
      });
    } catch (err: any) {
      console.error("Background recomposite error:", err);
      res.status(400).json({ error: err.message || "Failed to composite background." });
    }
  }
);

// Direct binary download endpoint for generated results (supports GET and POST)
app.all("/api/background/download", async (req: Request, res: Response) => {
  try {
    const rawJobId = (req.body?.jobId || req.query.jobId) as string | undefined;
    const jobId = rawJobId && rawJobId.trim() !== "" ? rawJobId.trim() : undefined;

    const backgroundType = (req.body?.backgroundType || req.query.backgroundType || "transparent") as
      | "transparent"
      | "color"
      | "custom_image";
    const backgroundColor = (req.body?.backgroundColor || req.query.backgroundColor || "#ffffff") as string;
    const resolution = ((req.body?.resolution || req.query.resolution || "original") as string) as
      | "original"
      | "hd"
      | "4k";
    const outputFormat = ((req.body?.format || req.body?.outputFormat || req.query.format || "png") as string) as
      | "png"
      | "jpg"
      | "webp";

    let foregroundBuffer: Buffer | undefined;
    const foregroundBase64 = req.body?.foregroundBase64 || (typeof req.query.foregroundBase64 === "string" ? req.query.foregroundBase64 : undefined);
    if (typeof foregroundBase64 === "string" && foregroundBase64.length > 50) {
      try {
        const base64Clean = foregroundBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
        foregroundBuffer = Buffer.from(base64Clean, "base64");
      } catch (e) {
        console.warn("Failed to parse foregroundBase64 in download:", e);
      }
    }

    if (!jobId && !foregroundBuffer) {
      return res.status(400).json({ error: "No active session or image data provided for download." });
    }

    const result = await replaceImageBackground({
      jobId,
      foregroundBuffer,
      backgroundType,
      backgroundColor,
      resolution,
      outputFormat,
    });

    res.setHeader("Content-Type", result.mimeType);
    const prefix = backgroundType === "transparent" ? "smart-ai-transparent" : `smart-ai-${backgroundType}`;
    const resTag = resolution !== "original" ? `-${resolution}` : "";
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${prefix}${resTag}-${Date.now()}.${result.format}"`
    );
    res.setHeader("X-Width", result.width.toString());
    res.setHeader("X-Height", result.height.toString());
    res.setHeader("X-Has-Alpha", result.hasAlpha ? "true" : "false");
    res.setHeader("X-Output-Size", result.size.toString());
    if (result.jobId) {
      res.setHeader("X-Job-Id", result.jobId);
    }
    res.send(result.buffer);
  } catch (err: any) {
    console.warn("Background download notice:", err.message);
    res.status(400).json({ error: err.message || "Failed to download image." });
  }
});

// Release cached job resources from server memory
app.post("/api/background/release", (req: Request, res: Response) => {
  const jobId = req.body.jobId;
  if (jobId) {
    releaseBackgroundJob(jobId);
  }
  res.json({ success: true });
});

// Replace background (solid color, custom image, or transparent HD/4K) - legacy fallback
app.post(
  "/api/background/replace",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "customBackground", maxCount: 1 },
  ]),
  checkFileQuota,
  async (req: Request, res: Response) => {
    const { clientKey, user } = getClientContext(req);
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const imageFile = files?.image?.[0] || (req.file as Express.Multer.File | undefined);
      const customBgFile = files?.customBackground?.[0];

      const jobId = req.body.jobId as string | undefined;

      if (!jobId && !imageFile) {
        refundUsage(clientKey, "fileTools");
        return res.status(400).json({ error: "Please upload a subject photo." });
      }

      const backgroundType = (req.body.backgroundType || "color") as
        | "transparent"
        | "color"
        | "custom_image";
      const backgroundColor = req.body.backgroundColor || "#ffffff";
      const resolution = (req.body.resolution || "original") as "original" | "hd" | "4k";
      const outputFormat = (req.body.outputFormat || "png") as "png" | "jpg" | "webp";
      const isForeground = req.body.isForeground === "true" || req.body.isForeground === true;
      const isDownload = req.body.download === "true" || req.query.download === "true";

      let foregroundBuffer = imageFile?.buffer;
      if (!jobId && !isForeground && imageFile) {
        const seg = await removeImageBackground(imageFile.buffer, {
          resolution: "original",
          format: "png",
        });
        foregroundBuffer = seg.buffer;
      }

      const result = await replaceImageBackground({
        jobId,
        foregroundBuffer,
        backgroundType,
        backgroundColor,
        customBackgroundBuffer: customBgFile?.buffer,
        resolution,
        outputFormat,
      });

      logActivity({
        userId: user?.id,
        feature: "file_tools",
        action: "AI Background Replacement",
        details: `Replaced background with ${backgroundType} (${result.width}x${result.height}, ${result.format})`,
      });

      if (isDownload) {
        res.setHeader("Content-Type", result.mimeType);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="smart-ai-bg-replaced-${Date.now()}.${result.format}"`
        );
        res.setHeader("X-Width", result.width.toString());
        res.setHeader("X-Height", result.height.toString());
        res.setHeader("X-Output-Size", result.size.toString());
        return res.send(result.buffer);
      }

      res.json({
        success: true,
        jobId: result.jobId || jobId,
        base64: `data:${result.mimeType};base64,${result.buffer.toString("base64")}`,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.size,
      });
    } catch (err: any) {
      refundUsage(clientKey, "fileTools");
      console.error("Background replacement error:", err);
      res.status(400).json({ error: err.message || "Failed to replace background." });
    }
  }
);

// ==========================================
// 5. PRODUCTION SEO ENDPOINTS & STATIC ASSETS
// ==========================================

// Serve static assets from public (e.g. /og-image.png, favicon)
app.use(express.static(path.join(process.cwd(), "public")));

// Technical SEO: robots.txt
app.get("/robots.txt", handleRobotsTxt);

// Technical SEO: sitemap.xml
app.get("/sitemap.xml", handleSitemapXml);

// Production Technical SEO Diagnostics & Search Console Audit Endpoint
app.get("/api/seo/diagnostics", handleSeoDiagnosticsApi);

// 301 Permanent Redirect for alternative/legacy background remover URL
app.get("/background-remover", (req: Request, res: Response) => {
  res.redirect(301, "/image-background-remover");
});

// Google Search Console Site Verification File (direct delivery)
app.get("/google0fdc91d48d434718.html", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=UTF-8");
  res.setHeader("Cache-Control", "public, max-age=0");
  res.status(200).send("google-site-verification: google0fdc91d48d434718.html\n");
});

app.get(/^\/google[a-zA-Z0-9]+\.html$/, (req: Request, res: Response, next: NextFunction) => {
  const filename = path.basename(req.path);
  const filePath = path.join(process.cwd(), "public", filename);
  if (fs.existsSync(filePath)) {
    return res.status(200).type("text/html").sendFile(filePath);
  }
  next();
});

// ==========================================
// 6. VITE MIDDLEWARE & SERVER-SIDE SEO PAGE RENDERING
// ==========================================

async function startServer() {
  const isDev = process.env.NODE_ENV !== "production";
  const distPath = path.join(process.cwd(), "dist");

  let vite: any = null;
  if (isDev) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
  }

  // Handle all HTML page requests with dynamic production SEO & real 404 response
  app.get("*", async (req: Request, res: Response, next: NextFunction) => {
    // Only intercept GET requests
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api/")) return next();

    const normalizedPath = req.path.replace(/\/+$/, "") || "/";
    const baseUrl = getBaseUrl(req);

    try {
      let rawTemplate: string;
      if (isDev) {
        const indexPath = path.join(process.cwd(), "index.html");
        rawTemplate = fs.readFileSync(indexPath, "utf-8");
        rawTemplate = await vite.transformIndexHtml(req.originalUrl, rawTemplate);
      } else {
        const indexPath = path.join(distPath, "index.html");
        if (!fs.existsSync(indexPath)) {
          return res.status(500).send("Production build missing index.html");
        }
        rawTemplate = fs.readFileSync(indexPath, "utf-8");
      }

      // Check if requested path matches an official SEO page
      const pageConfig = SEO_PAGES[normalizedPath];
      if (pageConfig) {
        res.setHeader("X-Robots-Tag", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
        const renderedHtml = renderPageWithSeo(rawTemplate, pageConfig, baseUrl);
        return res.status(200).type("text/html").send(renderedHtml);
      }

      // If the path is not recognized, return real 404 status code and friendly 404 page
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      const notFoundHtml = render404Page(rawTemplate, baseUrl, req.path);
      return res.status(404).type("text/html").send(notFoundHtml);
    } catch (err: any) {
      if (isDev && vite) {
        vite.ssrFixStacktrace(err);
      }
      console.error("HTML rendering error:", err);
      next(err);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart AI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
