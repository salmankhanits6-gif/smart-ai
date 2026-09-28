import { PagesFunction, handleOptions, corsHeaders } from "../../types";
import { PDFDocument } from "pdf-lib";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return handleOptions(request);
};

export const onRequestPost: PagesFunction = async ({ request }) => {
  try {
    const formData = await request.formData();
    const entries = formData.getAll("pdfs");
    const files: { buffer: Uint8Array; name: string }[] = [];

    for (const entry of entries) {
      if (entry && typeof entry === "object" && "arrayBuffer" in entry) {
        const file = entry as File;
        files.push({
          buffer: new Uint8Array(await file.arrayBuffer()),
          name: file.name || "doc.pdf",
        });
      }
    }

    if (files.length < 2) {
      return new Response(JSON.stringify({ error: "Please upload at least 2 PDF files to merge." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(request) },
      });
    }

    const mergedPdf = await PDFDocument.create();
    let totalOriginalSize = 0;

    for (const f of files) {
      totalOriginalSize += f.buffer.byteLength;
      const pdf = await PDFDocument.load(f.buffer, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save();
    return new Response(mergedBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="smart-ai-merged-${Date.now()}.pdf"`,
        "X-Original-Size": totalOriginalSize.toString(),
        "X-Output-Size": mergedBytes.byteLength.toString(),
        "X-Page-Count": mergedPdf.getPageCount().toString(),
        ...corsHeaders(request),
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to merge PDF files." }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders(request) },
    });
  }
};
