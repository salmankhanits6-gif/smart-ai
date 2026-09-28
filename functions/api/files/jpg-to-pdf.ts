import { PagesFunction, handleOptions, corsHeaders } from "../../types";
import { PDFDocument } from "pdf-lib";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return handleOptions(request);
};

export const onRequestPost: PagesFunction = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Multipart form-data expected." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(request) },
      });
    }

    const formData = await request.formData();
    const files: { buffer: Uint8Array; name: string; type: string }[] = [];

    const entries = formData.getAll("images");
    for (const entry of entries) {
      if (entry && typeof entry === "object" && "arrayBuffer" in entry) {
        const file = entry as File;
        const ab = await file.arrayBuffer();
        files.push({
          buffer: new Uint8Array(ab),
          name: file.name || "image.jpg",
          type: file.type || "image/jpeg",
        });
      }
    }

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "Please upload at least 1 image." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(request) },
      });
    }

    const pageSize = (formData.get("pageSize") as string) || "auto";
    const orientation = (formData.get("orientation") as string) || "auto";
    const margin = (formData.get("margin") as string) || "none";
    const marginPoints = margin === "standard" ? 36 : margin === "small" ? 18 : 0;

    const pdfDoc = await PDFDocument.create();
    let totalOriginalSize = 0;

    for (const f of files) {
      totalOriginalSize += f.buffer.byteLength;
      let embeddedImage: any;

      const isPng = f.type.includes("png") || (f.buffer.length > 4 && f.buffer[0] === 0x89 && f.buffer[1] === 0x50);
      try {
        if (isPng) {
          embeddedImage = await pdfDoc.embedPng(f.buffer);
        } else {
          embeddedImage = await pdfDoc.embedJpg(f.buffer);
        }
      } catch {
        // Retry alternative embedding
        try {
          embeddedImage = await pdfDoc.embedPng(f.buffer);
        } catch {
          embeddedImage = await pdfDoc.embedJpg(f.buffer);
        }
      }

      const imgWidth = embeddedImage.width;
      const imgHeight = embeddedImage.height;

      let pageWidth = imgWidth;
      let pageHeight = imgHeight;

      if (pageSize !== "auto") {
        const baseDims: Record<string, [number, number]> = {
          a4: [595.28, 841.89],
          letter: [612, 792],
        };
        const [stdW, stdH] = baseDims[pageSize] || [595.28, 841.89];
        let isLandscape = false;
        if (orientation === "auto") {
          isLandscape = imgWidth > imgHeight;
        } else if (orientation === "landscape") {
          isLandscape = true;
        }

        pageWidth = isLandscape ? Math.max(stdW, stdH) : Math.min(stdW, stdH);
        pageHeight = isLandscape ? Math.min(stdW, stdH) : Math.max(stdW, stdH);
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
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
    const filename = files.length === 1 ? `${files[0].name.replace(/\.[^/.]+$/, "")}.pdf` : `smart-ai-converted-${Date.now()}.pdf`;

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Original-Size": totalOriginalSize.toString(),
        "X-Output-Size": pdfBytes.byteLength.toString(),
        "X-Page-Count": files.length.toString(),
        ...corsHeaders(request),
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to convert JPG to PDF." }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders(request) },
    });
  }
};
