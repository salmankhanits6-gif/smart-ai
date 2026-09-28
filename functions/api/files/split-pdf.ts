import { PagesFunction, handleOptions, corsHeaders } from "../../types";
import { PDFDocument } from "pdf-lib";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return handleOptions(request);
};

export const onRequestPost: PagesFunction = async ({ request }) => {
  try {
    const formData = await request.formData();
    const fileEntry = formData.get("pdf");
    const pageSelection = (formData.get("pageSelection") as string) || "1";

    if (!fileEntry || typeof fileEntry !== "object" || !("arrayBuffer" in fileEntry)) {
      return new Response(JSON.stringify({ error: "Please upload a valid PDF file." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(request) },
      });
    }

    const file = fileEntry as File;
    const arrayBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(new Uint8Array(arrayBuffer), { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();

    // Parse page range (e.g. "1,2-4")
    const pagesToExtract: number[] = [];
    const parts = pageSelection.split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-").map((n) => parseInt(n.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
            if (!pagesToExtract.includes(i - 1)) pagesToExtract.push(i - 1);
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages && !pagesToExtract.includes(p - 1)) {
          pagesToExtract.push(p - 1);
        }
      }
    }

    if (pagesToExtract.length === 0) {
      pagesToExtract.push(0); // fallback to first page
    }

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(sourcePdf, pagesToExtract);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const splitBytes = await newPdf.save();
    return new Response(splitBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="smart-ai-split-${Date.now()}.pdf"`,
        "X-Original-Size": arrayBuffer.byteLength.toString(),
        "X-Output-Size": splitBytes.byteLength.toString(),
        "X-Page-Count": pagesToExtract.length.toString(),
        ...corsHeaders(request),
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to split PDF." }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders(request) },
    });
  }
};
