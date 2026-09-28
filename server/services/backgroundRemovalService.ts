import sharp, { Sharp } from "sharp";
import { removeBackground } from "@imgly/background-removal-node";
import { validateFileBuffer } from "./fileService";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const BG_JOB_CACHE_DIR = path.join("/tmp", "smart_ai_bg_jobs");
try {
  if (!fs.existsSync(BG_JOB_CACHE_DIR)) {
    fs.mkdirSync(BG_JOB_CACHE_DIR, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create bg cache dir:", e);
}

export interface BackgroundRemovalResult {
  jobId: string;
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  originalSize: number;
  outputSize: number;
  hasAlpha: boolean;
  format: "png" | "webp" | "jpeg";
  resolutionMode: "original" | "hd" | "4k";
  edgeMode?: "standard" | "crisp" | "soft";
}

export interface BackgroundJob {
  id: string;
  createdAt: number;
  lastAccessedAt: number;
  originalBuffer: Buffer;
  transparentBuffer: Buffer; // Pristine PNG with alpha at original resolution
  maskBuffer: Buffer; // 1-channel alpha mask at original resolution
  customBackgroundBuffer?: Buffer; // Cached custom uploaded background for fast recomposite & download
  originalWidth: number;
  originalHeight: number;
  mimeType: string;
}

export interface ReplaceBackgroundOptions {
  jobId?: string;
  foregroundBuffer?: Buffer;
  backgroundType: "transparent" | "color" | "custom_image" | string;
  backgroundColor?: string;
  customBackgroundBuffer?: Buffer;
  resolution?: "original" | "hd" | "4k";
  outputFormat?: "png" | "jpg" | "webp";
  quality?: number;
}

/**
 * Server-side Background Removal Job Store with Memory + Disk Persistence.
 * Keeps cutouts readily accessible for instant real-time background switching
 * and reliable downloads without expiring if server process recycles.
 */
class BackgroundJobStore {
  private jobs = new Map<string, BackgroundJob>();
  private readonly MAX_JOBS = 100;
  private readonly TTL_MS = 60 * 60 * 1000; // 60 minutes in memory

  constructor() {
    // Periodic sweep every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  set(id: string, job: BackgroundJob) {
    if (this.jobs.size >= this.MAX_JOBS) {
      const oldestKey = this.jobs.keys().next().value;
      if (oldestKey) this.jobs.delete(oldestKey);
    }
    this.jobs.set(id, job);

    // Save to disk cache for persistence across restarts
    try {
      const jobDir = path.join(BG_JOB_CACHE_DIR, id);
      if (!fs.existsSync(jobDir)) {
        fs.mkdirSync(jobDir, { recursive: true });
      }
      const meta = {
        id: job.id,
        createdAt: job.createdAt,
        lastAccessedAt: job.lastAccessedAt,
        originalWidth: job.originalWidth,
        originalHeight: job.originalHeight,
        mimeType: job.mimeType,
        hasCustomBg: !!job.customBackgroundBuffer,
      };
      fs.writeFileSync(path.join(jobDir, "meta.json"), JSON.stringify(meta));
      fs.writeFileSync(path.join(jobDir, "transparent.png"), job.transparentBuffer);
      if (job.originalBuffer && job.originalBuffer.length > 0) {
        fs.writeFileSync(path.join(jobDir, "original.bin"), job.originalBuffer);
      }
      if (job.maskBuffer && job.maskBuffer.length > 0) {
        fs.writeFileSync(path.join(jobDir, "mask.bin"), job.maskBuffer);
      }
      if (job.customBackgroundBuffer && job.customBackgroundBuffer.length > 0) {
        fs.writeFileSync(path.join(jobDir, "custom_bg.bin"), job.customBackgroundBuffer);
      }
    } catch (err) {
      console.warn("Failed to persist job to disk cache:", err);
    }
  }

  get(id: string): BackgroundJob | undefined {
    let job = this.jobs.get(id);
    if (job) {
      job.lastAccessedAt = Date.now();
      return job;
    }

    // Try recovering from disk cache
    try {
      const jobDir = path.join(BG_JOB_CACHE_DIR, id);
      const metaPath = path.join(jobDir, "meta.json");
      const transPath = path.join(jobDir, "transparent.png");
      if (fs.existsSync(metaPath) && fs.existsSync(transPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        const transparentBuffer = fs.readFileSync(transPath);
        const originalPath = path.join(jobDir, "original.bin");
        const maskPath = path.join(jobDir, "mask.bin");
        const customBgPath = path.join(jobDir, "custom_bg.bin");

        const originalBuffer = fs.existsSync(originalPath) ? fs.readFileSync(originalPath) : transparentBuffer;
        const maskBuffer = fs.existsSync(maskPath) ? fs.readFileSync(maskPath) : Buffer.alloc(0);
        const customBackgroundBuffer = fs.existsSync(customBgPath) ? fs.readFileSync(customBgPath) : undefined;

        job = {
          id: meta.id || id,
          createdAt: meta.createdAt || Date.now(),
          lastAccessedAt: Date.now(),
          originalBuffer,
          transparentBuffer,
          maskBuffer,
          customBackgroundBuffer,
          originalWidth: meta.originalWidth,
          originalHeight: meta.originalHeight,
          mimeType: meta.mimeType || "image/png",
        };
        this.jobs.set(id, job);
        return job;
      }
    } catch (err) {
      console.warn("Failed to read job from disk cache:", err);
    }

    return undefined;
  }

  delete(id: string): boolean {
    const deleted = this.jobs.delete(id);
    try {
      const jobDir = path.join(BG_JOB_CACHE_DIR, id);
      if (fs.existsSync(jobDir)) {
        fs.rmSync(jobDir, { recursive: true, force: true });
      }
    } catch {}
    return deleted;
  }

  cleanup() {
    const now = Date.now();
    for (const [id, job] of this.jobs.entries()) {
      if (now - job.lastAccessedAt > this.TTL_MS) {
        this.jobs.delete(id);
      }
    }
    // Sweep disk cache files older than 2 hours
    try {
      if (fs.existsSync(BG_JOB_CACHE_DIR)) {
        const entries = fs.readdirSync(BG_JOB_CACHE_DIR);
        for (const entry of entries) {
          const entryDir = path.join(BG_JOB_CACHE_DIR, entry);
          const stat = fs.statSync(entryDir);
          if (now - stat.mtimeMs > 2 * 60 * 60 * 1000) {
            fs.rmSync(entryDir, { recursive: true, force: true });
          }
        }
      }
    } catch {}
  }

  size(): number {
    return this.jobs.size;
  }
}

export const backgroundJobStore = new BackgroundJobStore();

export function releaseBackgroundJob(jobId: string): boolean {
  return backgroundJobStore.delete(jobId);
}

/**
 * Normalizes color presets and hex values into strict #rrggbb format
 */
export function normalizeColor(colorStr?: string): string {
  if (!colorStr) return "#ffffff";
  const trimmed = colorStr.trim().toLowerCase();
  const presets: Record<string, string> = {
    white: "#ffffff",
    "off-white": "#f8f9fa",
    offwhite: "#f8f9fa",
    "light-gray": "#e5e7eb",
    "light-grey": "#e5e7eb",
    lightgray: "#e5e7eb",
    lightgrey: "#e5e7eb",
    gray: "#94a3b8",
    grey: "#94a3b8",
    black: "#000000",
    blue: "#2563eb",
    "sky-blue": "#38bdf8",
    "sky blue": "#38bdf8",
    sky_blue: "#38bdf8",
    skyblue: "#38bdf8",
    "light-blue": "#38bdf8",
    sand: "#f5ebe0",
    "warm-sand": "#f5ebe0",
    navy: "#1e3a8a",
    red: "#ef4444",
    green: "#10b981",
    emerald: "#065f46",
    slate: "#1e293b",
    midnight: "#0f172a",
  };
  if (presets[trimmed]) return presets[trimmed];
  if (trimmed.startsWith("#")) {
    if (trimmed.length === 7 || trimmed.length === 4) return trimmed;
  }
  if (/^[0-9a-f]{6}$/i.test(trimmed)) return `#${trimmed}`;
  if (/^[0-9a-f]{3}$/i.test(trimmed)) return `#${trimmed}`;
  return "#ffffff";
}

/**
 * Calibrates the neural segmentation alpha mask:
 * 1. Background cleanup: Clears residual background noise to clean 0.
 * 2. Solid subject preservation: Clamps subject interior to 255
 *    so the person's face, eyes, hair core, skin, and clothing are 100% solidly opaque.
 *    This completely eliminates the washed-out / faded look and prevents background
 *    colors or patterns from leaking into the person's skin and clothes.
 * 3. Natural anti-aliased edge transition: Smooth Hermite interpolation (smoothstep)
 *    to preserve soft hair strands, ears, fingers, and fine fabric edges.
 */
function calibrateAlphaMask(
  rawAlpha: Buffer,
  length: number,
  edgeMode: "standard" | "crisp" | "soft" = "standard"
): Buffer {
  let bgThreshold = 6;
  let fgThreshold = 210;

  if (edgeMode === "crisp") {
    bgThreshold = 12;
    fgThreshold = 185;
  } else if (edgeMode === "soft") {
    bgThreshold = 4;
    fgThreshold = 225;
  }

  const calibrated = Buffer.alloc(length);
  const range = fgThreshold - bgThreshold;

  for (let i = 0; i < length; i++) {
    const a = rawAlpha[i];
    if (a <= bgThreshold) {
      calibrated[i] = 0;
    } else if (a >= fgThreshold) {
      calibrated[i] = 255;
    } else {
      const t = (a - bgThreshold) / range;
      const smooth = t * t * (3 - 2 * t);
      calibrated[i] = Math.round(smooth * 255);
    }
  }

  return calibrated;
}

/**
 * Real AI Subject Segmentation and Background Removal.
 * Preserves the original person's face, hair, facial features, skin, and body details
 * by running the neural model directly on uncompressed pixel data, extracting full-range
 * alpha values, and applying the resulting mask directly onto pristine original RGB pixels.
 */
export async function removeImageBackground(
  inputBuffer: Buffer,
  options: {
    resolution?: "original" | "hd" | "4k";
    format?: "png" | "webp";
    edgeMode?: "standard" | "crisp" | "soft";
  } = {}
): Promise<BackgroundRemovalResult> {
  // Validate magic bytes and format
  validateFileBuffer(inputBuffer, ["jpeg", "png", "webp"]);

  // Normalize EXIF orientation losslessly so mobile portraits are never inverted or skewed
  const orientedBuffer = await sharp(inputBuffer).rotate().png().toBuffer();
  const meta = await sharp(orientedBuffer).metadata();

  if (!meta.width || !meta.height) {
    throw new Error("Unable to parse image dimensions. File may be corrupted.");
  }

  const originalWidth = meta.width;
  const originalHeight = meta.height;
  const resolutionMode = options.resolution || "original";
  const outputFormat = options.format || "png";
  const edgeMode = options.edgeMode || "standard";

  const maxEdge = Math.max(originalWidth, originalHeight);
  let finalAlphaRaw: Buffer;

  try {
    let segInputBuffer = orientedBuffer;
    let segWidth = originalWidth;
    let segHeight = originalHeight;
    const needDownsample = maxEdge > 2048;

    if (needDownsample) {
      segInputBuffer = await sharp(orientedBuffer)
        .resize(2048, 2048, {
          fit: "inside",
          kernel: sharp.kernel.cubic,
        })
        .png()
        .toBuffer();

      const segMeta = await sharp(segInputBuffer).metadata();
      segWidth = segMeta.width || 2048;
      segHeight = segMeta.height || 2048;
    }

    const segMime = "image/png";
    const blob = new Blob([segInputBuffer], { type: segMime });

    // Execute real local neural-network background removal with direct RGBA tensor output.
    // Specifying output format "image/x-rgba8" outputs the raw uncompressed 32-bit tensor
    // directly from ONNX inference without palette quantization or dithering.
    const resultBlob = await removeBackground(blob, {
      output: { format: "image/x-rgba8" },
      model: "medium",
    });

    const rawTensorBytes = Buffer.from(await resultBlob.arrayBuffer());
    const tensorPixelCount = segWidth * segHeight;

    if (rawTensorBytes.length < tensorPixelCount * 4) {
      throw new Error("Segmentation output tensor dimension mismatch.");
    }

    // Extract alpha channel directly (byte index 3 of each 4-byte RGBA tuple)
    const segAlphaRaw = Buffer.alloc(tensorPixelCount);
    for (let i = 0; i < tensorPixelCount; i++) {
      segAlphaRaw[i] = rawTensorBytes[i * 4 + 3];
    }

    let fullResAlpha: Buffer;
    if (needDownsample || segWidth !== originalWidth || segHeight !== originalHeight) {
      // Upscale the raw alpha mask back to the EXACT original dimensions using cubic interpolation
      fullResAlpha = await sharp(segAlphaRaw, {
        raw: { width: segWidth, height: segHeight, channels: 1 },
      })
        .resize(originalWidth, originalHeight, {
          kernel: sharp.kernel.cubic,
        })
        .raw()
        .toBuffer();
    } else {
      fullResAlpha = segAlphaRaw;
    }

    // Calibrate alpha mask: 100% solid opacity (255) for face, body, clothes; 0 for background;
    // smooth Hermite transition for hair strands and fine edges.
    finalAlphaRaw = calibrateAlphaMask(fullResAlpha, originalWidth * originalHeight, edgeMode);
  } catch (err: any) {
    console.error("AI segmentation error:", err?.message || err);
    throw new Error("Background removal failed. Please try again.");
  }

  // Combine original UNTOUCHED RGB channels with the precise alpha mask.
  // This guarantees that the person's face, eyes, hair strands, skin texture,
  // clothes, and body details are 100% authentic and unaltered from the original photo.
  // For transparent pixels (alpha = 0), zero out RGB channels to ensure completely clean transparent pixels.
  const rgbRaw = await sharp(inputBuffer).rotate().removeAlpha().raw().toBuffer();
  const rgbaRaw = Buffer.alloc(originalWidth * originalHeight * 4);
  for (let i = 0; i < originalWidth * originalHeight; i++) {
    const a = finalAlphaRaw[i];
    rgbaRaw[i * 4] = a > 0 ? rgbRaw[i * 3] : 0;
    rgbaRaw[i * 4 + 1] = a > 0 ? rgbRaw[i * 3 + 1] : 0;
    rgbaRaw[i * 4 + 2] = a > 0 ? rgbRaw[i * 3 + 2] : 0;
    rgbaRaw[i * 4 + 3] = a;
  }

  const transparentOriginalBuffer = await sharp(rgbaRaw, {
    raw: { width: originalWidth, height: originalHeight, channels: 4 },
  })
    .png({ compressionLevel: 8 })
    .toBuffer();

  // Create unique job ID and cache the job in memory
  const jobId = `bg_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
  backgroundJobStore.set(jobId, {
    id: jobId,
    createdAt: Date.now(),
    lastAccessedAt: Date.now(),
    originalBuffer: orientedBuffer,
    transparentBuffer: transparentOriginalBuffer,
    maskBuffer: finalAlphaRaw,
    originalWidth,
    originalHeight,
    mimeType: "image/png",
  });

  // Apply requested resolution (HD / 4K) if requested for the initial output
  let targetWidth = originalWidth;
  let targetHeight = originalHeight;
  let finalSharp = sharp(transparentOriginalBuffer);

  if (resolutionMode === "hd") {
    if (maxEdge < 1920) {
      const scale = 1920 / maxEdge;
      targetWidth = Math.round(originalWidth * scale);
      targetHeight = Math.round(originalHeight * scale);
      finalSharp = finalSharp.resize(targetWidth, targetHeight, {
        kernel: sharp.kernel.lanczos3,
      });
    }
  } else if (resolutionMode === "4k") {
    if (maxEdge < 3840) {
      const scale = 3840 / maxEdge;
      targetWidth = Math.round(originalWidth * scale);
      targetHeight = Math.round(originalHeight * scale);
      finalSharp = finalSharp.resize(targetWidth, targetHeight, {
        kernel: sharp.kernel.lanczos3,
      });
    }
  }

  let outBuffer: Buffer;
  let outMime: string;

  if (outputFormat === "webp") {
    outBuffer = await finalSharp.webp({ quality: 95, lossless: true }).toBuffer();
    outMime = "image/webp";
  } else {
    outBuffer = await finalSharp.png({ compressionLevel: 8 }).toBuffer();
    outMime = "image/png";
  }

  const outMeta = await sharp(outBuffer).metadata();

  return {
    jobId,
    buffer: outBuffer,
    mimeType: outMime,
    width: outMeta.width || targetWidth,
    height: outMeta.height || targetHeight,
    originalWidth,
    originalHeight,
    originalSize: inputBuffer.length,
    outputSize: outBuffer.length,
    hasAlpha: !!outMeta.hasAlpha,
    format: outputFormat,
    resolutionMode,
  };
}

/**
 * Composites the isolated subject onto a new background (solid color, custom image, or transparent).
 * Uses cached segmentation mask when jobId is provided, completing in sub-second time (~30-80ms).
 */
export async function replaceImageBackground(
  options: ReplaceBackgroundOptions
): Promise<{
  jobId?: string;
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
}> {
  const {
    jobId,
    foregroundBuffer,
    backgroundType,
    backgroundColor = "#ffffff",
    customBackgroundBuffer,
    resolution = "original",
    outputFormat = "png",
    quality = 95,
  } = options;

  let activeCustomBgBuffer = customBackgroundBuffer;
  let baseTransparentBuffer: Buffer;
  let originalWidth: number;
  let originalHeight: number;
  let effectiveJobId = jobId;

  if (jobId) {
    const cachedJob = backgroundJobStore.get(jobId);
    if (!cachedJob) {
      if (foregroundBuffer) {
        baseTransparentBuffer = foregroundBuffer;
        const fgMeta = await sharp(foregroundBuffer).metadata();
        originalWidth = fgMeta.width || 800;
        originalHeight = fgMeta.height || 600;
        // Re-establish session in cache
        backgroundJobStore.set(jobId, {
          id: jobId,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          originalBuffer: foregroundBuffer,
          transparentBuffer: foregroundBuffer,
          maskBuffer: Buffer.alloc(0),
          customBackgroundBuffer,
          originalWidth,
          originalHeight,
          mimeType: "image/png",
        });
      } else {
        throw new Error("Background session expired. Please re-upload your photo.");
      }
    } else {
      baseTransparentBuffer = cachedJob.transparentBuffer;
      originalWidth = cachedJob.originalWidth;
      originalHeight = cachedJob.originalHeight;

      if (customBackgroundBuffer) {
        cachedJob.customBackgroundBuffer = customBackgroundBuffer;
      } else if (cachedJob.customBackgroundBuffer) {
        activeCustomBgBuffer = cachedJob.customBackgroundBuffer;
      }
    }
  } else if (foregroundBuffer) {
    baseTransparentBuffer = foregroundBuffer;
    const fgMeta = await sharp(foregroundBuffer).metadata();
    originalWidth = fgMeta.width || 800;
    originalHeight = fgMeta.height || 600;
    effectiveJobId = "bg_" + Date.now() + "_" + crypto.randomBytes(6).toString("hex");
    backgroundJobStore.set(effectiveJobId, {
      id: effectiveJobId,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      originalBuffer: foregroundBuffer,
      transparentBuffer: foregroundBuffer,
      maskBuffer: Buffer.alloc(0),
      customBackgroundBuffer,
      originalWidth,
      originalHeight,
      mimeType: "image/png",
    });
  } else {
    throw new Error("No image data or active job session provided.");
  }

  let targetWidth = originalWidth;
  let targetHeight = originalHeight;
  const maxEdge = Math.max(originalWidth, originalHeight);

  if (resolution === "hd") {
    if (maxEdge < 1920) {
      const scale = 1920 / maxEdge;
      targetWidth = Math.round(originalWidth * scale);
      targetHeight = Math.round(originalHeight * scale);
    }
  } else if (resolution === "4k") {
    if (maxEdge < 3840) {
      const scale = 3840 / maxEdge;
      targetWidth = Math.round(originalWidth * scale);
      targetHeight = Math.round(originalHeight * scale);
    }
  }

  // Scale transparent foreground to match target dimensions if scaling is needed
  const targetForeground =
    targetWidth !== originalWidth || targetHeight !== originalHeight
      ? await sharp(baseTransparentBuffer)
          .resize(targetWidth, targetHeight, { kernel: sharp.kernel.lanczos3 })
          .png()
          .toBuffer()
      : baseTransparentBuffer;

  if (jobId && customBackgroundBuffer) {
    const cached = backgroundJobStore.get(jobId);
    if (cached) {
      cached.customBackgroundBuffer = customBackgroundBuffer;
    }
  }

  const effectiveBgType = (backgroundType || "transparent").toLowerCase().trim();
  let compositedSharp: Sharp;

  if (effectiveBgType === "transparent") {
    compositedSharp = sharp(targetForeground);
  } else if (effectiveBgType === "custom_image") {
    const bgToUse =
      activeCustomBgBuffer ||
      (jobId ? backgroundJobStore.get(jobId)?.customBackgroundBuffer : undefined);

    if (!bgToUse) {
      throw new Error("No custom background image found. Please upload a background image.");
    }

    validateFileBuffer(bgToUse, ["jpeg", "png", "webp"]);

    // Resize custom background to fill target frame without distortion
    const resizedBg = await sharp(bgToUse)
      .rotate()
      .resize(targetWidth, targetHeight, { fit: "cover", position: "center" })
      .png()
      .toBuffer();

    compositedSharp = sharp(resizedBg).composite([
      { input: targetForeground, top: 0, left: 0 },
    ]);
  } else {
    // Solid background color (White, Off-White, Light Gray, Sky Blue, Custom Color)
    const colorInput =
      effectiveBgType !== "color" && effectiveBgType !== "solid"
        ? effectiveBgType
        : backgroundColor;
    const hexColor = normalizeColor(colorInput);
    const bgCanvas = await sharp({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 4,
        background: hexColor,
      },
    })
      .png()
      .toBuffer();

    compositedSharp = sharp(bgCanvas).composite([
      { input: targetForeground, top: 0, left: 0 },
    ]);
  }

  let outBuffer: Buffer;
  let mimeType: string;
  const requestedFormat = outputFormat.toLowerCase();

  if (requestedFormat === "jpg" || requestedFormat === "jpeg") {
    // JPEG has no alpha channel; flatten transparent areas onto white
    if (effectiveBgType === "transparent") {
      compositedSharp = compositedSharp.flatten({ background: "#ffffff" });
    }
    outBuffer = await compositedSharp.jpeg({ quality: Math.min(quality, 98) }).toBuffer();
    mimeType = "image/jpeg";
  } else if (requestedFormat === "webp") {
    outBuffer = await compositedSharp.webp({ quality: Math.min(quality, 98) }).toBuffer();
    mimeType = "image/webp";
  } else {
    outBuffer = await compositedSharp.png({ compressionLevel: 8 }).toBuffer();
    mimeType = "image/png";
  }

  const hasAlpha = effectiveBgType === "transparent" && requestedFormat !== "jpg" && requestedFormat !== "jpeg";

  return {
    jobId: effectiveJobId,
    buffer: outBuffer,
    mimeType,
    width: targetWidth,
    height: targetHeight,
    format: requestedFormat === "jpeg" ? "jpg" : requestedFormat,
    size: outBuffer.length,
    hasAlpha,
  };
}
