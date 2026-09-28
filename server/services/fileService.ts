import { PDFDocument, rgb } from "pdf-lib";
import sharp from "sharp";
import { createCanvas } from "@napi-rs/canvas";
import JSZip from "jszip";
import { createWorker } from "tesseract.js";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  ImageRun,
  BorderStyle,
  AlignmentType,
  ShadingType,
} from "docx";

export interface FileProcessingResult {
  filename: string;
  mimeType: string;
  data: Buffer;
  originalSize: number;
  outputSize: number;
  reductionPercentage?: number;
  details?: Record<string, any>;
}

export interface ImageMetadata {
  format?: string;
  width?: number;
  height?: number;
  space?: string;
  channels?: number;
  depth?: string;
  density?: number;
  hasAlpha?: boolean;
  size: number;
  aspectRatio?: string;
}

// Dynamically load pdfjs to ensure clean Node CJS/ESM compatibility
async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs;
}

// =========================================================================
// 0. Binary Magic Byte & File Signature Validation
// =========================================================================

export function validateFileBuffer(
  buffer: Buffer,
  allowedTypes: ("pdf" | "jpeg" | "png" | "webp")[],
  filename?: string
): { detectedType: "pdf" | "jpeg" | "png" | "webp"; isValid: boolean } {
  if (!buffer || buffer.length === 0) {
    throw new Error(`The uploaded file ${filename ? `("${filename}")` : ""} is empty (0 bytes).`);
  }

  let detectedType: "pdf" | "jpeg" | "png" | "webp" | null = null;

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    detectedType = "jpeg";
  } else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    detectedType = "png";
  } else if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    detectedType = "webp";
  } else if (
    buffer.length >= 5 &&
    buffer.toString("ascii", 0, Math.min(buffer.length, 1024)).includes("%PDF-")
  ) {
    detectedType = "pdf";
  }

  if (!detectedType) {
    throw new Error(
      `Unsupported or corrupted file${filename ? ` ("${filename}")` : ""}. File signature does not match any allowed format.`
    );
  }

  if (!allowedTypes.includes(detectedType)) {
    throw new Error(
      `Invalid format for ${filename || "file"}. Expected: ${allowedTypes
        .map((t) => t.toUpperCase())
        .join(", ")}, but detected: ${detectedType.toUpperCase()}.`
    );
  }

  return { detectedType, isValid: true };
}

// Helper to parse page selection e.g. "1-3, 5"
export function parsePageRange(pageSelection: string, totalPages: number): number[] {
  if (!pageSelection || pageSelection.trim().toLowerCase() === "all") {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const targetPages = new Set<number>();
  const tokens = pageSelection.split(",").map((t) => t.trim());

  for (const token of tokens) {
    if (token.includes("-")) {
      const [startStr, endStr] = token.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          targetPages.add(i);
        }
      }
    } else {
      const pageNum = parseInt(token, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        targetPages.add(pageNum);
      }
    }
  }

  const sorted = Array.from(targetPages).sort((a, b) => a - b);
  if (sorted.length === 0) {
    throw new Error(
      `No valid pages selected. The PDF contains ${totalPages} page(s). Example: "1-2" or "1, 3".`
    );
  }
  return sorted;
}

// =========================================================================
// 1. FEATURED CONVERTER: JPG → PDF
// =========================================================================

export interface JpgToPdfOptions {
  pageSize?: "auto" | "a4" | "letter";
  orientation?: "auto" | "portrait" | "landscape";
  margin?: "none" | "small" | "standard";
}

/**
 * Converts one or multiple JPG/JPEG images into a single professional PDF.
 * Preserves exact aspect ratio, supports custom reordering, page sizing & orientation.
 */
export async function convertJpgToPdf(
  files: { buffer: Buffer; name: string }[],
  options: JpgToPdfOptions = {}
): Promise<FileProcessingResult> {
  if (!files || files.length === 0) {
    throw new Error("Please select at least one JPG image to convert.");
  }

  const pdfDoc = await PDFDocument.create();
  let totalOriginalSize = 0;

  const pageSizeOption = options.pageSize || "auto";
  const orientationOption = options.orientation || "auto";
  const marginOption = options.margin || "none";

  const marginPoints = marginOption === "standard" ? 36 : marginOption === "small" ? 18 : 0;

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    totalOriginalSize += file.buffer.length;

    // Validate binary format (accepts JPEG or PNG)
    validateFileBuffer(file.buffer, ["jpeg", "png"], file.name);

    // Normalize EXIF orientation and ensure clean buffer
    const sharpInstance = sharp(file.buffer).rotate();
    const meta = await sharpInstance.metadata();
    if (!meta.width || !meta.height) {
      throw new Error(`Unable to read image dimensions for "${file.name}". File may be corrupt.`);
    }

    // Convert to JPEG if not already
    const jpegBuffer = await sharpInstance.jpeg({ quality: 95 }).toBuffer();
    const embeddedImage = await pdfDoc.embedJpg(jpegBuffer);

    const imgWidth = meta.width;
    const imgHeight = meta.height;

    let pageWidth: number;
    let pageHeight: number;

    if (pageSizeOption === "auto") {
      // Fit to exact image dimensions: 1:1 pixel to point mapping, zero cropping
      pageWidth = imgWidth;
      pageHeight = imgHeight;
    } else {
      // Standard page dimensions (in PostScript points, 72 pt/inch)
      const baseDims: Record<"a4" | "letter", [number, number]> = {
        a4: [595.28, 841.89],
        letter: [612, 792],
      };
      const [stdW, stdH] = baseDims[pageSizeOption];

      let isLandscape = false;
      if (orientationOption === "auto") {
        isLandscape = imgWidth > imgHeight;
      } else if (orientationOption === "landscape") {
        isLandscape = true;
      }

      pageWidth = isLandscape ? Math.max(stdW, stdH) : Math.min(stdW, stdH);
      pageHeight = isLandscape ? Math.min(stdW, stdH) : Math.max(stdW, stdH);
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Calculate dimensions to preserve aspect ratio within margins
    const usableWidth = Math.max(1, pageWidth - 2 * marginPoints);
    const usableHeight = Math.max(1, pageHeight - 2 * marginPoints);

    const scale = Math.min(usableWidth / imgWidth, usableHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;

    const x = marginPoints + (usableWidth - drawWidth) / 2;
    const y = marginPoints + (usableHeight - drawHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const outputBuffer = Buffer.from(pdfBytes);

  // Verification step: check %PDF- header and reload in pdf-lib
  if (outputBuffer.length < 100 || !outputBuffer.toString("ascii", 0, 10).includes("%PDF-")) {
    throw new Error("PDF generation verification failed: Invalid binary header.");
  }
  const verifyDoc = await PDFDocument.load(outputBuffer);
  if (verifyDoc.getPageCount() !== files.length) {
    throw new Error(
      `PDF verification error: Expected ${files.length} pages, but generated ${verifyDoc.getPageCount()}.`
    );
  }

  const filename =
    files.length === 1
      ? `${files[0].name.replace(/\.[^/.]+$/, "")}.pdf`
      : `converted-images-${Date.now()}.pdf`;

  return {
    filename,
    mimeType: "application/pdf",
    data: outputBuffer,
    originalSize: totalOriginalSize,
    outputSize: outputBuffer.length,
    details: {
      pageCount: files.length,
      pageSize: pageSizeOption,
      orientation: orientationOption,
      verified: true,
    },
  };
}

// =========================================================================
// 2. FEATURED CONVERTER: PDF → JPG
// =========================================================================

export interface PdfToJpgOptions {
  pageSelection?: string; // "all", "1-3", "1, 4"
  scale?: number; // 1, 1.5, 2, 3 (default 2 for high-res)
  quality?: number; // 60 - 100 (default 90)
}

/**
 * Converts each page of a PDF document into a high-quality JPG image.
 * Preserves exact aspect ratio.
 * Single page selected -> returns direct JPG.
 * Multiple pages selected -> returns ZIP archive containing page JPGs.
 */
export async function convertPdfToJpg(
  pdfBuffer: Buffer,
  options: PdfToJpgOptions = {}
): Promise<FileProcessingResult & { isZip: boolean; pageImages?: { pageNumber: number; dataUrl: string }[] }> {
  validateFileBuffer(pdfBuffer, ["pdf"]);

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    disableFontFace: true,
  });

  const doc = await loadingTask.promise;
  const totalPages = doc.numPages;

  if (totalPages === 0) {
    throw new Error("The uploaded PDF contains no pages.");
  }

  const pagesToConvert = parsePageRange(options.pageSelection || "all", totalPages);
  const scale = options.scale && options.scale >= 1 && options.scale <= 3 ? options.scale : 2.0;
  const quality = options.quality && options.quality >= 50 && options.quality <= 100 ? options.quality : 90;

  const generatedJpgs: { pageNumber: number; buffer: Buffer; width: number; height: number }[] = [];
  const previewDataUrls: { pageNumber: number; dataUrl: string }[] = [];

  for (const pageNum of pagesToConvert) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const context = canvas.getContext("2d");

    // Clear background to pure white (PDFs often have transparent backgrounds)
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await (page.render as any)({
      canvasContext: context,
      viewport,
      canvas,
    }).promise;

    const rawJpeg = canvas.toBuffer("image/jpeg");

    // Optimize through sharp for color profile and high quality mozjpeg compression
    const optimizedJpeg = await sharp(rawJpeg)
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    // Verify JPEG magic bytes
    if (
      optimizedJpeg.length < 100 ||
      optimizedJpeg[0] !== 0xff ||
      optimizedJpeg[1] !== 0xd8 ||
      optimizedJpeg[2] !== 0xff
    ) {
      throw new Error(`Verification failed on generated JPG for page ${pageNum}.`);
    }

    const meta = await sharp(optimizedJpeg).metadata();
    generatedJpgs.push({
      pageNumber: pageNum,
      buffer: optimizedJpeg,
      width: meta.width || canvas.width,
      height: meta.height || canvas.height,
    });

    // Provide preview for the first 3 pages
    if (previewDataUrls.length < 3) {
      const previewThumb = await sharp(optimizedJpeg).resize({ width: 300 }).jpeg({ quality: 75 }).toBuffer();
      previewDataUrls.push({
        pageNumber: pageNum,
        dataUrl: `data:image/jpeg;base64,${previewThumb.toString("base64")}`,
      });
    }
  }

  // Single page result -> Direct JPG download
  if (generatedJpgs.length === 1) {
    const single = generatedJpgs[0];
    return {
      filename: `page-${single.pageNumber}.jpg`,
      mimeType: "image/jpeg",
      data: single.buffer,
      originalSize: pdfBuffer.length,
      outputSize: single.buffer.length,
      isZip: false,
      pageImages: previewDataUrls,
      details: {
        convertedPagesCount: 1,
        pageNumber: single.pageNumber,
        dimensions: `${single.width}x${single.height} px`,
        scale,
        quality,
        verified: true,
      },
    };
  }

  // Multi-page result -> Package into a ZIP
  const zip = new JSZip();
  let totalOutputBytes = 0;

  generatedJpgs.forEach((item) => {
    const pad = item.pageNumber.toString().padStart(2, "0");
    zip.file(`page-${pad}.jpg`, item.buffer);
    totalOutputBytes += item.buffer.length;
  });

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // Verify ZIP
  const verifyZip = await JSZip.loadAsync(zipBuffer);
  const zipFileCount = Object.keys(verifyZip.files).length;
  if (zipFileCount !== generatedJpgs.length) {
    throw new Error(`ZIP verification failed: Expected ${generatedJpgs.length} files in archive.`);
  }

  return {
    filename: `pdf-pages-${Date.now()}.zip`,
    mimeType: "application/zip",
    data: zipBuffer,
    originalSize: pdfBuffer.length,
    outputSize: zipBuffer.length,
    isZip: true,
    pageImages: previewDataUrls,
    details: {
      convertedPagesCount: generatedJpgs.length,
      totalPagesInPdf: totalPages,
      scale,
      quality,
      verified: true,
    },
  };
}

// =========================================================================
// 3. FEATURED CONVERTER: JPG → Word (.docx)
// =========================================================================

export interface JpgToWordOptions {
  includeReferenceImage?: boolean;
}

/**
 * Converts a JPG/JPEG image into a genuine Microsoft Word (.docx) document.
 * Uses real Tesseract.js OCR to recognize visible text, preserves paragraphs,
 * reconstructs detected tables, flags uncertain text, and embeds source image.
 */
export async function convertJpgToWord(
  imageBuffer: Buffer,
  options: JpgToWordOptions = {}
): Promise<FileProcessingResult> {
  validateFileBuffer(imageBuffer, ["jpeg", "png", "webp"]);

  // Pre-process image with sharp for optimal OCR accuracy
  const rotatedBuffer = await sharp(imageBuffer).rotate().toBuffer();
  const meta = await sharp(rotatedBuffer).metadata();

  const ocrWorker = await createWorker("eng");
  let ocrResult: any;

  try {
    ocrResult = await ocrWorker.recognize(rotatedBuffer);
  } finally {
    await ocrWorker.terminate();
  }

  const extractedText = (ocrResult.data?.text || "").trim();
  const rawLines: string[] = extractedText.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
  const avgConfidence = Math.round(ocrResult.data?.confidence || 0);

  // Document building
  const docChildren: (Paragraph | Table)[] = [];

  // Title header
  docChildren.push(
    new Paragraph({
      text: "Converted Document",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    })
  );

  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Extracted with Smart AI OCR • Confidence: ${avgConfidence}% • Date: ${new Date().toLocaleDateString()}`,
          italics: true,
          color: "666666",
          size: 18,
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // Embed original reference image if requested (scaled to standard page bounds)
  if (options.includeReferenceImage !== false && meta.width && meta.height) {
    try {
      const maxDisplayWidth = 520;
      const scale = Math.min(1, maxDisplayWidth / meta.width);
      const displayWidth = Math.round(meta.width * scale);
      const displayHeight = Math.round(meta.height * scale);

      const compressedPreview = await sharp(rotatedBuffer)
        .resize({ width: displayWidth, height: displayHeight, fit: "inside" })
        .jpeg({ quality: 85 })
        .toBuffer();

      docChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: compressedPreview,
              transformation: {
                width: displayWidth,
                height: displayHeight,
              },
            } as any),
          ],
          spacing: { after: 240 },
        })
      );
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Original Source Image (Embedded Reference)",
              italics: true,
              size: 16,
              color: "888888",
            }),
          ],
          spacing: { after: 300 },
        })
      );
    } catch {
      // Non-fatal if image embedding encounters edge cases
    }
  }

  // Section divider for editable text
  docChildren.push(
    new Paragraph({
      text: "Extracted Text Content",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 140 },
    })
  );

  if (rawLines.length === 0) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "No legible text was detected in the provided image. If this image contains faint, blurry, or non-Latin text, consider uploading a higher resolution capture.",
            italics: true,
            color: "777777",
          }),
        ],
      })
    );
  } else {
    // Detect tables vs paragraphs
    let lineIdx = 0;
    let tableCount = 0;

    while (lineIdx < rawLines.length) {
      const line = rawLines[lineIdx];

      // Check for table structure: lines with pipes "|" or 2+ columns with large spacing
      const hasPipes = line.includes("|");
      const hasColumnSpacings = /\s{3,}/.test(line) && line.split(/\s{3,}/).length >= 2;

      if ((hasPipes || hasColumnSpacings) && lineIdx + 1 < rawLines.length) {
        // Collect consecutive table rows
        const tableRowsRaw: string[] = [];
        while (lineIdx < rawLines.length) {
          const curLine = rawLines[lineIdx];
          const curHasPipes = curLine.includes("|");
          const curHasSpacings = /\s{3,}/.test(curLine) && curLine.split(/\s{3,}/).length >= 2;
          if (curHasPipes || curHasSpacings || curLine.startsWith("---")) {
            if (!curLine.replace(/[-|:\s]/g, "").trim().length && curLine.includes("-")) {
              // separator line, skip
            } else {
              tableRowsRaw.push(curLine);
            }
            lineIdx++;
          } else {
            break;
          }
        }

        if (tableRowsRaw.length >= 2) {
          tableCount++;
          // Build genuine docx Table
          const parsedRows = tableRowsRaw.map((r) => {
            if (r.includes("|")) {
              return r
                .split("|")
                .map((c) => c.trim())
                .filter((c) => c.length > 0);
            } else {
              return r.split(/\s{3,}/).map((c) => c.trim());
            }
          });

          const maxCols = Math.max(...parsedRows.map((r) => r.length));

          const docxRows: TableRow[] = parsedRows.map((rowCells, rIdx) => {
            const isHeader = rIdx === 0;
            const cells: TableCell[] = [];
            for (let c = 0; c < maxCols; c++) {
              const cellText = rowCells[c] || "";
              cells.push(
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cellText,
                          bold: isHeader,
                          size: isHeader ? 20 : 18,
                        }),
                      ],
                    }),
                  ],
                  shading: isHeader
                    ? { fill: "F1F5F9", type: ShadingType.CLEAR, color: "auto" }
                    : undefined,
                  margins: { top: 100, bottom: 100, left: 140, right: 140 },
                })
              );
            }
            return new TableRow({ children: cells, tableHeader: isHeader });
          });

          docChildren.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: docxRows,
            })
          );
          docChildren.push(new Paragraph({ spacing: { after: 180 } }));
          continue;
        }
      }

      // Check for headings: short, capitalized, or standalone title
      const isShort = line.length < 50;
      const isUpperCase = line === line.toUpperCase() && line.length > 4 && /[A-Z]/.test(line);

      if (isShort && (isUpperCase || lineIdx === 0)) {
        docChildren.push(
          new Paragraph({
            text: line,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 140, after: 80 },
          })
        );
      } else {
        // Standard body paragraph
        // If confidence is low, annotate appropriately
        const isLowConfidence = avgConfidence < 60;
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                italics: isLowConfidence,
                color: isLowConfidence ? "555555" : "111827",
                size: 22,
              }),
            ],
            spacing: { after: 120, line: 320 },
          })
        );
      }

      lineIdx++;
    }
  }

  // Create DOCX Document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  const docxBuffer = await Packer.toBuffer(doc);

  // Verification step: Ensure valid DOCX zip archive containing [Content_Types].xml and word/document.xml
  const verifyZip = await JSZip.loadAsync(docxBuffer);
  const hasContentTypes = !!verifyZip.file("[Content_Types].xml");
  const hasWordDoc = !!verifyZip.file("word/document.xml");

  if (!hasContentTypes || !hasWordDoc) {
    throw new Error("DOCX package verification failed: Missing required Office Open XML structures.");
  }

  return {
    filename: `converted-${Date.now()}.docx`,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    data: docxBuffer,
    originalSize: imageBuffer.length,
    outputSize: docxBuffer.length,
    details: {
      avgConfidence,
      lineCount: rawLines.length,
      wordCount: extractedText.split(/\s+/).filter(Boolean).length,
      verified: true,
    },
  };
}

// =========================================================================
// 4. FEATURED CONVERTER: PDF → Word (.docx)
// =========================================================================

export interface PdfToWordOptions {
  pageSelection?: string; // "all", "1-5"
}

/**
 * Converts a PDF document into a genuine Microsoft Word (.docx) document.
 * Extracts text, detects headings, lists, tables, and page layout.
 * Automatically detects scanned/image-only PDFs and invokes real OCR!
 */
export async function convertPdfToWord(
  pdfBuffer: Buffer,
  options: PdfToWordOptions = {}
): Promise<FileProcessingResult> {
  validateFileBuffer(pdfBuffer, ["pdf"]);

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    disableFontFace: true,
  });

  const doc = await loadingTask.promise;
  const totalPages = doc.numPages;

  if (totalPages === 0) {
    throw new Error("The uploaded PDF contains no pages.");
  }

  const pagesToProcess = parsePageRange(options.pageSelection || "all", totalPages);

  // First pass: assess whether PDF has selectable digital text or is scanned/image-only
  let totalSelectableChars = 0;
  const pageTextData: {
    pageNum: number;
    items: { str: string; fontSize: number; x: number; y: number }[];
  }[] = [];

  for (const pNum of pagesToProcess) {
    const page = await doc.getPage(pNum);
    const textContent = await page.getTextContent();
    const items = textContent.items.map((it: any) => ({
      str: it.str || "",
      fontSize: it.transform ? Math.round(Math.hypot(it.transform[0], it.transform[1])) : 12,
      x: it.transform ? it.transform[4] : 0,
      y: it.transform ? it.transform[5] : 0,
    }));

    const textLen = items.reduce((acc: number, it: any) => acc + it.str.length, 0);
    totalSelectableChars += textLen;
    pageTextData.push({ pageNum: pNum, items });
  }

  const isScannedPdf = totalSelectableChars < 30 * pagesToProcess.length;

  const docChildren: (Paragraph | Table)[] = [];

  // Document Title
  docChildren.push(
    new Paragraph({
      text: "Converted PDF Document",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    })
  );

  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Processed with Smart AI • Mode: ${
            isScannedPdf ? "Real OCR (Scanned Document Engine)" : "Native Digital Flow Engine"
          } • Pages: ${pagesToProcess.length} • Date: ${new Date().toLocaleDateString()}`,
          italics: true,
          color: "666666",
          size: 18,
        }),
      ],
      spacing: { after: 240 },
    })
  );

  let totalWordsCount = 0;

  if (isScannedPdf) {
    // REAL OCR Pipeline for Scanned PDFs
    const ocrWorker = await createWorker("eng");
    try {
      for (let i = 0; i < pagesToProcess.length; i++) {
        const pNum = pagesToProcess[i];
        const page = await doc.getPage(pNum);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await (page.render as any)({ canvasContext: ctx, viewport, canvas }).promise;
        const pagePng = canvas.toBuffer("image/png");

        const ocrRes = await ocrWorker.recognize(pagePng);
        const pageText = (ocrRes.data?.text || "").trim();
        const lines = pageText.split("\n").map((l: string) => l.trim()).filter(Boolean);

        if (i > 0) {
          docChildren.push(new Paragraph({ pageBreakBefore: true }));
        }

        docChildren.push(
          new Paragraph({
            text: `Page ${pNum}`,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 120 },
          })
        );

        for (const line of lines) {
          totalWordsCount += line.split(/\s+/).filter(Boolean).length;

          // Detect bullet points
          const isBullet = /^[•\-*]\s+/.test(line);
          const cleanLine = isBullet ? line.replace(/^[•\-*]\s+/, "") : line;

          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: cleanLine,
                  size: 22,
                }),
              ],
              bullet: isBullet ? { level: 0 } : undefined,
              spacing: { after: 100, line: 300 },
            })
          );
        }
      }
    } finally {
      await ocrWorker.terminate();
    }
  } else {
    // Digital Text Extraction Pipeline
    for (let i = 0; i < pageTextData.length; i++) {
      const { pageNum, items } = pageTextData[i];

      if (i > 0) {
        docChildren.push(new Paragraph({ pageBreakBefore: true }));
      }

      docChildren.push(
        new Paragraph({
          text: `Page ${pageNum}`,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 120 },
        })
      );

      // Group items into lines by Y coordinate (within tolerance)
      const lineMap: { y: number; fontSize: number; items: typeof items }[] = [];

      for (const item of items) {
        if (!item.str.trim()) continue;
        const existingLine = lineMap.find((l) => Math.abs(l.y - item.y) <= 4);
        if (existingLine) {
          existingLine.items.push(item);
          existingLine.fontSize = Math.max(existingLine.fontSize, item.fontSize);
        } else {
          lineMap.push({ y: item.y, fontSize: item.fontSize, items: [item] });
        }
      }

      // Sort lines top to bottom (Y descending in PDF coordinates)
      lineMap.sort((a, b) => b.y - a.y);

      for (const lineGroup of lineMap) {
        // Sort items inside line left to right (X ascending)
        lineGroup.items.sort((a, b) => a.x - b.x);
        const lineText = lineGroup.items.map((it) => it.str).join(" ").trim();
        if (!lineText) continue;

        totalWordsCount += lineText.split(/\s+/).filter(Boolean).length;

        // Check if heading based on font size (> 15pt)
        if (lineGroup.fontSize >= 16) {
          docChildren.push(
            new Paragraph({
              text: lineText,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 160, after: 100 },
            })
          );
        } else if (lineGroup.fontSize >= 13) {
          docChildren.push(
            new Paragraph({
              text: lineText,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 120, after: 80 },
            })
          );
        } else {
          const isBullet = /^[•\-*]\s+/.test(lineText);
          const cleanText = isBullet ? lineText.replace(/^[•\-*]\s+/, "") : lineText;

          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: cleanText,
                  size: 22,
                }),
              ],
              bullet: isBullet ? { level: 0 } : undefined,
              spacing: { after: 100, line: 300 },
            })
          );
        }
      }
    }
  }

  // Build Word Document
  const docxDoc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  const docxBuffer = await Packer.toBuffer(docxDoc);

  // Verification step: Ensure valid DOCX zip archive containing [Content_Types].xml and word/document.xml
  const verifyZip = await JSZip.loadAsync(docxBuffer);
  const hasContentTypes = !!verifyZip.file("[Content_Types].xml");
  const hasWordDoc = !!verifyZip.file("word/document.xml");

  if (!hasContentTypes || !hasWordDoc) {
    throw new Error("DOCX package verification failed: Missing required Office Open XML structures.");
  }

  return {
    filename: `converted-${Date.now()}.docx`,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    data: docxBuffer,
    originalSize: pdfBuffer.length,
    outputSize: docxBuffer.length,
    details: {
      totalPages: pagesToProcess.length,
      isScanned: isScannedPdf,
      wordCount: totalWordsCount,
      verified: true,
    },
  };
}

// =========================================================================
// 5. EXISTING PDF UTILITIES (Preserved & Enhanced)
// =========================================================================

/**
 * Merges two or more PDF buffers into a single PDF
 */
export async function mergePdfs(
  files: { buffer: Buffer; name: string }[]
): Promise<FileProcessingResult> {
  if (files.length < 2) {
    throw new Error("Please provide at least 2 PDF files to merge.");
  }

  const mergedPdf = await PDFDocument.create();
  let totalOriginalSize = 0;

  for (const file of files) {
    validateFileBuffer(file.buffer, ["pdf"], file.name);
    totalOriginalSize += file.buffer.length;
    const pdf = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();
  const outputBuffer = Buffer.from(mergedBytes);

  return {
    filename: `merged-${Date.now()}.pdf`,
    mimeType: "application/pdf",
    data: outputBuffer,
    originalSize: totalOriginalSize,
    outputSize: outputBuffer.length,
    details: {
      totalPages: mergedPdf.getPageCount(),
      mergedFileCount: files.length,
    },
  };
}

/**
 * Splits a PDF by extracting specified page ranges
 */
export async function splitPdf(
  fileBuffer: Buffer,
  pageSelection: string
): Promise<FileProcessingResult> {
  validateFileBuffer(fileBuffer, ["pdf"]);
  const sourcePdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();

  const pagesToExtract = parsePageRange(pageSelection, totalPages).map((p) => p - 1);

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(sourcePdf, pagesToExtract);
  copiedPages.forEach((page) => newPdf.addPage(page));

  const splitBytes = await newPdf.save();
  const outputBuffer = Buffer.from(splitBytes);

  return {
    filename: `split-pages-${pagesToExtract.map((p) => p + 1).join("_")}.pdf`,
    mimeType: "application/pdf",
    data: outputBuffer,
    originalSize: fileBuffer.length,
    outputSize: outputBuffer.length,
    details: {
      extractedPages: pagesToExtract.map((p) => p + 1),
      totalPagesOriginal: totalPages,
    },
  };
}

/**
 * Compresses a PDF by optimizing streams and removing unreferenced objects
 */
export async function compressPdf(fileBuffer: Buffer): Promise<FileProcessingResult> {
  validateFileBuffer(fileBuffer, ["pdf"]);
  const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });

  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  const outputBuffer = Buffer.from(compressedBytes);
  const reduction = Math.round(((fileBuffer.length - outputBuffer.length) / fileBuffer.length) * 100);

  return {
    filename: `compressed-${Date.now()}.pdf`,
    mimeType: "application/pdf",
    data: outputBuffer,
    originalSize: fileBuffer.length,
    outputSize: outputBuffer.length,
    reductionPercentage: Math.max(0, reduction),
    details: {
      pageCount: pdfDoc.getPageCount(),
    },
  };
}

/**
 * Converts one or more images into a structured PDF document (legacy compatibility)
 */
export async function imagesToPdf(
  images: { buffer: Buffer; mimeType: string; name: string }[]
): Promise<FileProcessingResult> {
  return convertJpgToPdf(
    images.map((img) => ({ buffer: img.buffer, name: img.name })),
    { pageSize: "auto", margin: "none" }
  );
}

// =========================================================================
// 6. EXISTING IMAGE UTILITIES (Preserved & Enhanced)
// =========================================================================

/**
 * Convert image between formats: jpg, png, webp
 */
export async function convertImage(
  buffer: Buffer,
  targetFormat: "jpeg" | "png" | "webp",
  options: { quality?: number } = {}
): Promise<FileProcessingResult> {
  validateFileBuffer(buffer, ["jpeg", "png", "webp"]);
  const quality = options.quality ?? 85;
  let pipeline = sharp(buffer).rotate();

  let outputBuffer: Buffer;
  let mimeType: string;
  let extension: string;

  if (targetFormat === "jpeg") {
    outputBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    mimeType = "image/jpeg";
    extension = "jpg";
  } else if (targetFormat === "png") {
    outputBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
    mimeType = "image/png";
    extension = "png";
  } else if (targetFormat === "webp") {
    outputBuffer = await pipeline.webp({ quality }).toBuffer();
    mimeType = "image/webp";
    extension = "webp";
  } else {
    throw new Error(`Unsupported target format: ${targetFormat}`);
  }

  const meta = await sharp(outputBuffer).metadata();
  const reduction = Math.round(((buffer.length - outputBuffer.length) / buffer.length) * 100);

  return {
    filename: `converted-${Date.now()}.${extension}`,
    mimeType,
    data: outputBuffer,
    originalSize: buffer.length,
    outputSize: outputBuffer.length,
    reductionPercentage: reduction,
    details: {
      width: meta.width,
      height: meta.height,
      format: targetFormat,
    },
  };
}

/**
 * Resizes an image preserving aspect ratio unless explicitly told otherwise
 */
export async function resizeImage(
  buffer: Buffer,
  options: {
    width?: number;
    height?: number;
    maintainAspectRatio?: boolean;
    format?: "jpeg" | "png" | "webp";
  }
): Promise<FileProcessingResult> {
  validateFileBuffer(buffer, ["jpeg", "png", "webp"]);
  const currentMeta = await sharp(buffer).metadata();
  if (!currentMeta.width || !currentMeta.height) {
    throw new Error("Unable to read image dimensions.");
  }

  const targetWidth = options.width ? Math.round(options.width) : undefined;
  const targetHeight = options.height ? Math.round(options.height) : undefined;

  if (!targetWidth && !targetHeight) {
    throw new Error("Please specify at least a new width or height.");
  }

  const maintainRatio = options.maintainAspectRatio !== false;
  const fitMode = maintainRatio ? "inside" : "fill";

  let pipeline = sharp(buffer).rotate().resize({
    width: targetWidth,
    height: targetHeight,
    fit: fitMode,
    withoutEnlargement: false,
  });

  const targetFormat =
    options.format ||
    (currentMeta.format === "png"
      ? "png"
      : currentMeta.format === "webp"
      ? "webp"
      : "jpeg");
  let outputBuffer: Buffer;
  let mimeType: string;
  let extension: string;

  if (targetFormat === "png") {
    outputBuffer = await pipeline.png().toBuffer();
    mimeType = "image/png";
    extension = "png";
  } else if (targetFormat === "webp") {
    outputBuffer = await pipeline.webp({ quality: 90 }).toBuffer();
    mimeType = "image/webp";
    extension = "webp";
  } else {
    outputBuffer = await pipeline.jpeg({ quality: 90 }).toBuffer();
    mimeType = "image/jpeg";
    extension = "jpg";
  }

  const newMeta = await sharp(outputBuffer).metadata();

  return {
    filename: `resized-${newMeta.width}x${newMeta.height}.${extension}`,
    mimeType,
    data: outputBuffer,
    originalSize: buffer.length,
    outputSize: outputBuffer.length,
    details: {
      originalDimensions: `${currentMeta.width}x${currentMeta.height}`,
      newDimensions: `${newMeta.width}x${newMeta.height}`,
      aspectRatioMaintained: maintainRatio,
    },
  };
}

/**
 * Compresses an image with smart quality optimization
 */
export async function compressImage(
  buffer: Buffer,
  quality: number = 75
): Promise<FileProcessingResult> {
  validateFileBuffer(buffer, ["jpeg", "png", "webp"]);
  const meta = await sharp(buffer).metadata();
  const format = meta.format || "jpeg";

  let pipeline = sharp(buffer).rotate();
  let outputBuffer: Buffer;
  let mimeType: string;
  let extension: string;

  if (format === "png") {
    outputBuffer = await pipeline
      .png({ quality: Math.min(100, Math.max(10, quality)), compressionLevel: 9 })
      .toBuffer();
    mimeType = "image/png";
    extension = "png";
  } else if (format === "webp") {
    outputBuffer = await pipeline
      .webp({ quality: Math.min(100, Math.max(10, quality)) })
      .toBuffer();
    mimeType = "image/webp";
    extension = "webp";
  } else {
    outputBuffer = await pipeline
      .jpeg({ quality: Math.min(100, Math.max(10, quality)), mozjpeg: true })
      .toBuffer();
    mimeType = "image/jpeg";
    extension = "jpg";
  }

  const reduction = Math.round(((buffer.length - outputBuffer.length) / buffer.length) * 100);

  return {
    filename: `compressed-${Date.now()}.${extension}`,
    mimeType,
    data: outputBuffer,
    originalSize: buffer.length,
    outputSize: outputBuffer.length,
    reductionPercentage: Math.max(0, reduction),
    details: {
      width: meta.width,
      height: meta.height,
      compressionQuality: quality,
    },
  };
}

/**
 * Extracts complete technical file info
 */
export async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  validateFileBuffer(buffer, ["jpeg", "png", "webp"]);
  const meta = await sharp(buffer).metadata();
  let aspectRatio: string | undefined;
  if (meta.width && meta.height) {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(meta.width, meta.height);
    aspectRatio = `${meta.width / divisor}:${meta.height / divisor}`;
  }

  return {
    format: meta.format,
    width: meta.width,
    height: meta.height,
    space: meta.space,
    channels: meta.channels,
    depth: meta.depth,
    density: meta.density,
    hasAlpha: meta.hasAlpha,
    size: buffer.length,
    aspectRatio,
  };
}
