import React, { useState, useRef } from "react";
import {
  FileBox,
  FileText,
  Image as ImageIcon,
  Minimize2,
  Maximize2,
  Scissors,
  Layers,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  FileCheck,
  Zap,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Sparkles,
  Settings2,
  Archive,
  BookOpen,
} from "lucide-react";
import { getStoredToken } from "../lib/api";
import { SeoToolContent } from "../components/SeoToolContent";
import { updateClientSeo } from "../lib/seo";

interface FileToolsViewProps {
  initialTool?: string;
  onQuotaUpdate?: () => void;
}

type MainCategory = "featured" | "pdf" | "image";
type FeaturedTool = "jpg-to-pdf" | "pdf-to-jpg" | "jpg-to-word" | "png-to-word" | "pdf-to-word";
type PdfSubTool = "merge" | "split" | "compress" | "images-to-pdf";
type ImageSubTool = "convert" | "resize" | "compress" | "info";

export const FileToolsView: React.FC<FileToolsViewProps> = ({
  initialTool,
  onQuotaUpdate,
}) => {
  // Navigation tabs
  const [activeCategory, setActiveCategory] = useState<MainCategory>(
    initialTool && ["merge", "split", "compress", "images-to-pdf"].includes(initialTool)
      ? "pdf"
      : initialTool && ["convert", "resize", "compress-img", "info"].includes(initialTool)
      ? "image"
      : "featured"
  );

  const [featuredTool, setFeaturedTool] = useState<FeaturedTool>(
    (initialTool as FeaturedTool) || "jpg-to-pdf"
  );
  const [pdfTool, setPdfTool] = useState<PdfSubTool>("merge");
  const [imageTool, setImageTool] = useState<ImageSubTool>("convert");

  // Files state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ id: string; url: string; name: string; size: number }[]>([]);

  // JPG to PDF options
  const [jpgPdfPageSize, setJpgPdfPageSize] = useState<"auto" | "a4" | "letter">("auto");
  const [jpgPdfOrientation, setJpgPdfOrientation] = useState<"auto" | "portrait" | "landscape">("auto");
  const [jpgPdfMargin, setJpgPdfMargin] = useState<"none" | "small" | "standard">("none");

  // PDF to JPG options
  const [pdfJpgPageRange, setPdfJpgPageRange] = useState<string>("all");
  const [pdfJpgScale, setPdfJpgScale] = useState<number>(2.0); // 1.0, 2.0, 3.0
  const [pdfJpgQuality, setPdfJpgQuality] = useState<number>(90);

  // JPG to Word options
  const [jpgWordEmbedImage, setJpgWordEmbedImage] = useState<boolean>(true);

  // PDF to Word options
  const [pdfWordPageRange, setPdfWordPageRange] = useState<string>("all");

  // Generic existing tools options
  const [pageSelection, setPageSelection] = useState<string>("1-2");
  const [targetFormat, setTargetFormat] = useState<"jpeg" | "png" | "webp">("webp");
  const [resizeWidth, setResizeWidth] = useState<number>(800);
  const [resizeHeight, setResizeHeight] = useState<number>(600);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  const [imageQuality, setImageQuality] = useState<number>(80);

  // Status and result states
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [imageMetadata, setImageMetadata] = useState<any | null>(null);

  const [successInfo, setSuccessInfo] = useState<{
    originalSize: number;
    outputSize: number;
    downloadUrl: string;
    filename: string;
    reductionPercent?: string | null;
    isZip?: boolean;
    pageCount?: number;
    wordCount?: number;
    confidence?: number;
    isScanned?: boolean;
    previewUrl?: string | null;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs when clearing
  const cleanupPreviews = () => {
    filePreviews.forEach((p) => URL.revokeObjectURL(p.url));
    setFilePreviews([]);
  };

  const handleFilesChosen = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setSuccessInfo(null);
    setImageMetadata(null);

    const newFiles = Array.from(files);

    // Multi-file is supported for JPG->PDF, PDF merge, and images-to-pdf
    const isMulti =
      (activeCategory === "featured" && featuredTool === "jpg-to-pdf") ||
      (activeCategory === "pdf" && (pdfTool === "merge" || pdfTool === "images-to-pdf"));

    const finalFiles = isMulti ? [...uploadedFiles, ...newFiles] : [newFiles[0]];
    setUploadedFiles(finalFiles);

    // Generate local image previews for image-based tools
    const previews = finalFiles.map((f) => ({
      id: `${f.name}-${f.size}-${Math.random()}`,
      name: f.name,
      size: f.size,
      url: f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
    }));
    setFilePreviews(previews);
  };

  const removeFile = (index: number) => {
    const updated = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updated);
    if (filePreviews[index]?.url) {
      URL.revokeObjectURL(filePreviews[index].url);
    }
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
    setSuccessInfo(null);
  };

  const moveFile = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= uploadedFiles.length) return;

    const filesCopy = [...uploadedFiles];
    const [moved] = filesCopy.splice(index, 1);
    filesCopy.splice(newIdx, 0, moved);
    setUploadedFiles(filesCopy);

    const previewsCopy = [...filePreviews];
    const [movedPrev] = previewsCopy.splice(index, 1);
    previewsCopy.splice(newIdx, 0, movedPrev);
    setFilePreviews(previewsCopy);
  };

  const clearFiles = () => {
    cleanupPreviews();
    setUploadedFiles([]);
    setSuccessInfo(null);
    setImageMetadata(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Trigger real server-side processing
  const handleProcess = async () => {
    if (uploadedFiles.length === 0) {
      setError("Please select at least one file to process.");
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccessInfo(null);

    try {
      let endpoint = "";
      const formData = new FormData();

      if (activeCategory === "featured") {
        if (featuredTool === "jpg-to-pdf") {
          endpoint = "/api/files/jpg-to-pdf";
          uploadedFiles.forEach((f) => formData.append("images", f));
          formData.append("pageSize", jpgPdfPageSize);
          formData.append("orientation", jpgPdfOrientation);
          formData.append("margin", jpgPdfMargin);
        } else if (featuredTool === "pdf-to-jpg") {
          endpoint = "/api/files/pdf-to-jpg";
          formData.append("pdf", uploadedFiles[0]);
          formData.append("pageSelection", pdfJpgPageRange.trim() || "all");
          formData.append("scale", pdfJpgScale.toString());
          formData.append("quality", pdfJpgQuality.toString());
        } else if (featuredTool === "jpg-to-word") {
          endpoint = "/api/files/jpg-to-word";
          formData.append("image", uploadedFiles[0]);
          formData.append("includeReferenceImage", jpgWordEmbedImage ? "true" : "false");
        } else if (featuredTool === "png-to-word") {
          endpoint = "/api/files/png-to-word";
          formData.append("image", uploadedFiles[0]);
          formData.append("includeReferenceImage", jpgWordEmbedImage ? "true" : "false");
        } else if (featuredTool === "pdf-to-word") {
          endpoint = "/api/files/pdf-to-word";
          formData.append("pdf", uploadedFiles[0]);
          formData.append("pageSelection", pdfWordPageRange.trim() || "all");
        }
      } else if (activeCategory === "pdf") {
        if (pdfTool === "merge") {
          if (uploadedFiles.length < 2) {
            throw new Error("Merge PDF requires at least 2 PDF files.");
          }
          endpoint = "/api/files/merge-pdf";
          uploadedFiles.forEach((f) => formData.append("pdfs", f));
        } else if (pdfTool === "split") {
          endpoint = "/api/files/split-pdf";
          formData.append("pdf", uploadedFiles[0]);
          formData.append("pageSelection", pageSelection);
        } else if (pdfTool === "compress") {
          endpoint = "/api/files/compress-pdf";
          formData.append("pdf", uploadedFiles[0]);
        } else if (pdfTool === "images-to-pdf") {
          endpoint = "/api/files/images-to-pdf";
          uploadedFiles.forEach((f) => formData.append("images", f));
        }
      } else {
        if (imageTool === "convert") {
          endpoint = "/api/files/convert-image";
          formData.append("image", uploadedFiles[0]);
          formData.append("targetFormat", targetFormat);
          formData.append("quality", imageQuality.toString());
        } else if (imageTool === "resize") {
          endpoint = "/api/files/resize-image";
          formData.append("image", uploadedFiles[0]);
          if (resizeWidth) formData.append("width", resizeWidth.toString());
          if (resizeHeight) formData.append("height", resizeHeight.toString());
          formData.append("maintainAspectRatio", maintainAspect ? "true" : "false");
        } else if (imageTool === "compress") {
          endpoint = "/api/files/compress-image";
          formData.append("image", uploadedFiles[0]);
          formData.append("quality", imageQuality.toString());
        } else if (imageTool === "info") {
          endpoint = "/api/files/image-info";
          formData.append("image", uploadedFiles[0]);
        }
      }

      const authToken = getStoredToken();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "File conversion failed. Please verify the input file.");
      }

      if (activeCategory === "image" && imageTool === "info") {
        const meta = await res.json();
        setImageMetadata(meta);
      } else {
        const blob = await res.blob();
        const contentDisposition = res.headers.get("Content-Disposition");
        let filename = "processed-document";
        if (contentDisposition && contentDisposition.includes("filename=")) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match && match[1]) filename = match[1];
        }

        const originalSize = parseInt(res.headers.get("X-Original-Size") || "0", 10);
        const outputSize = parseInt(res.headers.get("X-Output-Size") || blob.size.toString(), 10);
        const reductionPercent = res.headers.get("X-Reduction-Percent");
        const pageCount = parseInt(res.headers.get("X-Page-Count") || "0", 10);
        const wordCount = parseInt(res.headers.get("X-Word-Count") || "0", 10);
        const confidence = parseInt(res.headers.get("X-Confidence") || "0", 10);
        const isScanned = res.headers.get("X-Is-Scanned") === "true";
        const isZip = res.headers.get("X-Is-Zip") === "true" || filename.endsWith(".zip");

        const downloadUrl = URL.createObjectURL(blob);
        const isSingleJpg = blob.type.startsWith("image/");
        const previewUrl = isSingleJpg ? downloadUrl : null;

        setSuccessInfo({
          originalSize,
          outputSize,
          downloadUrl,
          filename,
          reductionPercent,
          isZip,
          pageCount: pageCount || undefined,
          wordCount: wordCount || undefined,
          confidence: confidence || undefined,
          isScanned,
          previewUrl,
        });

        if (onQuotaUpdate) onQuotaUpdate();
      }
    } catch (err: any) {
      setError(err.message || "Failed to process file.");
    } finally {
      setProcessing(false);
    }
  };

  // Determine accept attribute for file input
  const getAcceptAttribute = () => {
    if (activeCategory === "featured") {
      if (featuredTool === "jpg-to-pdf" || featuredTool === "jpg-to-word" || featuredTool === "png-to-word") {
        return "image/jpeg,image/png,image/webp";
      }
      return "application/pdf";
    }
    if (activeCategory === "pdf") {
      return pdfTool === "images-to-pdf" ? "image/jpeg,image/png,image/webp" : "application/pdf";
    }
    return "image/jpeg,image/png,image/webp";
  };

  const isMultiUpload =
    (activeCategory === "featured" && featuredTool === "jpg-to-pdf") ||
    (activeCategory === "pdf" && (pdfTool === "merge" || pdfTool === "images-to-pdf"));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">
          <FileBox className="w-4 h-4" />
          <span>Verified Binary Engine • No Placeholders</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {activeCategory === "featured" && featuredTool === "jpg-to-pdf"
            ? "JPG to PDF Converter"
            : activeCategory === "featured" && featuredTool === "pdf-to-jpg"
            ? "PDF to JPG Converter"
            : activeCategory === "featured" && featuredTool === "jpg-to-word"
            ? "JPG to Word Converter"
            : activeCategory === "featured" && featuredTool === "png-to-word"
            ? "PNG to Word Converter"
            : activeCategory === "featured" && featuredTool === "pdf-to-word"
            ? "PDF to Word Converter"
            : "File & Document Converters"}
        </h1>
        <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
          High-fidelity, server-side document transformations. Convert JPG to PDF, extract high-res JPGs from PDF, and perform real OCR into genuine editable Microsoft Word (.docx) files with strict privacy.
        </p>
      </div>

      {/* Top Level Category Switcher */}
      <div className="flex rounded-xl bg-slate-100 p-1 max-w-md border border-slate-200">
        <button
          id="tab-featured-converters"
          onClick={() => {
            setActiveCategory("featured");
            clearFiles();
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeCategory === "featured"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Featured Converters</span>
        </button>

        <button
          id="tab-pdf-tools"
          onClick={() => {
            setActiveCategory("pdf");
            clearFiles();
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeCategory === "pdf"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className="w-4 h-4 text-rose-500" />
          <span>PDF Utilities</span>
        </button>

        <button
          id="tab-image-tools"
          onClick={() => {
            setActiveCategory("image");
            clearFiles();
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeCategory === "image"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ImageIcon className="w-4 h-4 text-blue-500" />
          <span>Image Tools</span>
        </button>
      </div>

      {/* Sub-tool Selection Grid */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          {activeCategory === "featured"
            ? "Select Conversion Pipeline"
            : activeCategory === "pdf"
            ? "Select PDF Operation"
            : "Select Image Utility"}
        </label>

        {activeCategory === "featured" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              {
                id: "jpg-to-pdf",
                title: "JPG → PDF",
                desc: "Combine & reorder images",
                icon: <FileText className="w-4 h-4" />,
              },
              {
                id: "pdf-to-jpg",
                title: "PDF → JPG",
                desc: "Render pages to high-res JPG",
                icon: <ImageIcon className="w-4 h-4" />,
              },
              {
                id: "jpg-to-word",
                title: "JPG → Word",
                desc: "Real OCR into genuine .docx",
                icon: <BookOpen className="w-4 h-4" />,
              },
              {
                id: "png-to-word",
                title: "PNG → Word",
                desc: "OCR images into .docx",
                icon: <FileCheck className="w-4 h-4" />,
              },
              {
                id: "pdf-to-word",
                title: "PDF → Word",
                desc: "Extract text & OCR scanned docs",
                icon: <FileCheck className="w-4 h-4" />,
              },
            ].map((tool) => {
              const active = featuredTool === tool.id;
              return (
                <a
                  key={tool.id}
                  id={`featured-subtool-${tool.id}`}
                  href={`/${tool.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const nextTool = tool.id as FeaturedTool;
                    setFeaturedTool(nextTool);
                    clearFiles();
                    const nextPath = `/${nextTool}`;
                    if (typeof window !== "undefined" && window.location.pathname !== nextPath) {
                      window.history.pushState({}, "", nextPath);
                      updateClientSeo(nextPath);
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    active
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-emerald-500/20"
                      : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`p-1.5 rounded-lg ${
                        active ? "bg-slate-800 text-emerald-400" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {tool.icon}
                    </span>
                    {active && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm">{tool.title}</h3>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        active ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {tool.desc}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {activeCategory === "pdf" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: "merge", label: "Merge PDF", icon: <Layers className="w-4 h-4" /> },
              { id: "split", label: "Split PDF", icon: <Scissors className="w-4 h-4" /> },
              { id: "compress", label: "Compress PDF", icon: <Minimize2 className="w-4 h-4" /> },
              { id: "images-to-pdf", label: "Images → PDF", icon: <FileText className="w-4 h-4" /> },
            ].map((tool) => {
              const active = pdfTool === tool.id;
              return (
                <button
                  key={tool.id}
                  id={`pdf-subtool-${tool.id}`}
                  onClick={() => {
                    setPdfTool(tool.id as PdfSubTool);
                    clearFiles();
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 text-xs font-semibold ${
                    active
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className={active ? "text-emerald-400" : "text-slate-500"}>
                    {tool.icon}
                  </span>
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {activeCategory === "image" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: "convert", label: "Format Converter", icon: <RefreshCw className="w-4 h-4" /> },
              { id: "resize", label: "Resize Image", icon: <Maximize2 className="w-4 h-4" /> },
              { id: "compress", label: "Compress Image", icon: <Minimize2 className="w-4 h-4" /> },
              { id: "info", label: "File Info Inspector", icon: <FileCheck className="w-4 h-4" /> },
            ].map((tool) => {
              const active = imageTool === tool.id;
              return (
                <button
                  key={tool.id}
                  id={`image-subtool-${tool.id}`}
                  onClick={() => {
                    setImageTool(tool.id as ImageSubTool);
                    clearFiles();
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 text-xs font-semibold ${
                    active
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className={active ? "text-blue-400" : "text-slate-500"}>
                    {tool.icon}
                  </span>
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Workspace Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Upload Dropzone */}
        <div
          id="file-dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFilesChosen(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-all hover:bg-emerald-50/20 flex flex-col items-center justify-center"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={isMultiUpload}
            accept={getAcceptAttribute()}
            className="hidden"
            onChange={(e) => handleFilesChosen(e.target.files)}
          />

          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>

          <h3 className="text-sm font-bold text-slate-900 mb-1">
            {uploadedFiles.length === 0 ? "Choose or drag files here" : "Add more files or drop here"}
          </h3>
          <p className="text-xs text-slate-500">
            {activeCategory === "featured" ? (
              featuredTool === "jpg-to-pdf" ? (
                "Select one or multiple JPG/PNG images (supports custom reordering, up to 15MB each)"
              ) : featuredTool === "pdf-to-jpg" ? (
                "Select a PDF document (all pages or custom ranges converted to high-res JPG)"
              ) : featuredTool === "jpg-to-word" ? (
                "Select an image containing visible text or tables for real OCR extraction"
              ) : (
                "Select a PDF file (native digital text or scanned document OCR pipeline)"
              )
            ) : activeCategory === "pdf" ? (
              pdfTool === "merge" ? (
                "Select 2 or more PDF files to combine"
              ) : pdfTool === "images-to-pdf" ? (
                "Select one or more images"
              ) : (
                "Select a PDF document"
              )
            ) : (
              "Select JPG, PNG, or WEBP image file"
            )}
          </p>
        </div>

        {/* Selected Files List with Reorder Controls */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>
                Selected {uploadedFiles.length === 1 ? "File" : `Files (${uploadedFiles.length})`}
                {activeCategory === "featured" && featuredTool === "jpg-to-pdf" && (
                  <span className="text-slate-400 font-normal ml-2">
                    (Use arrows to arrange page sequence in PDF)
                  </span>
                )}
              </span>
              <button
                id="clear-all-files-btn"
                onClick={clearFiles}
                className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {uploadedFiles.map((file, idx) => {
                const preview = filePreviews[idx];
                return (
                  <div
                    key={preview?.id || idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {preview?.url ? (
                        <img
                          src={preview.url}
                          alt="preview"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0 bg-white"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 text-slate-600">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{file.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {Math.round(file.size / 1024)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Reorder buttons for JPG->PDF */}
                      {activeCategory === "featured" && featuredTool === "jpg-to-pdf" && uploadedFiles.length > 1 && (
                        <>
                          <button
                            title="Move Up"
                            disabled={idx === 0}
                            onClick={() => moveFile(idx, "up")}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Move Down"
                            disabled={idx === uploadedFiles.length - 1}
                            onClick={() => moveFile(idx, "down")}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      <button
                        title="Remove file"
                        onClick={() => removeFile(idx)}
                        className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Converter Specific Settings */}
        <div className="pt-2 border-t border-slate-100">
          {/* 1. JPG → PDF Settings */}
          {activeCategory === "featured" && featuredTool === "jpg-to-pdf" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Page Dimensions</span>
                </label>
                <select
                  id="jpg-pdf-page-size"
                  value={jpgPdfPageSize}
                  onChange={(e) => setJpgPdfPageSize(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="auto">Match Image Dimensions (1:1, Crisp)</option>
                  <option value="a4">Standard A4 Sheet</option>
                  <option value="letter">US Letter (8.5 x 11 in)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Auto preserves natural image resolution without borders.
                </p>
              </div>

              {jpgPdfPageSize !== "auto" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Orientation
                  </label>
                  <select
                    id="jpg-pdf-orientation"
                    value={jpgPdfOrientation}
                    onChange={(e) => setJpgPdfOrientation(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="auto">Auto (Detect per image aspect ratio)</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
              )}

              {jpgPdfPageSize !== "auto" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Page Margins
                  </label>
                  <select
                    id="jpg-pdf-margin"
                    value={jpgPdfMargin}
                    onChange={(e) => setJpgPdfMargin(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="none">No Margins (Full Bleed)</option>
                    <option value="small">Small Margins (18pt)</option>
                    <option value="standard">Standard Margins (36pt)</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 2. PDF → JPG Settings */}
          {activeCategory === "featured" && featuredTool === "pdf-to-jpg" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Page Selection
                </label>
                <input
                  id="pdf-jpg-page-selection"
                  type="text"
                  value={pdfJpgPageRange}
                  onChange={(e) => setPdfJpgPageRange(e.target.value)}
                  placeholder="e.g. all or 1-3, 5"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Use "all" for every page, or comma ranges like "1-3, 5".
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Resolution / Density
                </label>
                <select
                  id="pdf-jpg-scale"
                  value={pdfJpgScale}
                  onChange={(e) => setPdfJpgScale(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value={1.0}>Standard (1x ~72 DPI) - Fast</option>
                  <option value={1.5}>Medium (1.5x ~108 DPI)</option>
                  <option value={2.0}>High Resolution (2x ~144 DPI) - Recommended</option>
                  <option value={3.0}>Ultra Crisp (3x ~216 DPI) - Maximum Detail</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  JPEG Quality ({pdfJpgQuality}%)
                </label>
                <input
                  type="range"
                  min={60}
                  max={98}
                  value={pdfJpgQuality}
                  onChange={(e) => setPdfJpgQuality(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 mt-1"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Balanced</span>
                  <span>Photographic</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. JPG → Word Settings */}
          {activeCategory === "featured" && featuredTool === "jpg-to-word" && (
            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-800">
                <input
                  id="jpg-word-embed-image"
                  type="checkbox"
                  checked={jpgWordEmbedImage}
                  onChange={(e) => setJpgWordEmbedImage(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium">
                  Embed original source image in the generated Word document as reference
                </span>
              </label>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                <strong>Real OCR Engine:</strong> Smart AI processes characters, calculates optical confidence, groups paragraphs, and detects tabular structures. Unclear text is never fabricated.
              </div>
            </div>
          )}

          {/* 4. PDF → Word Settings */}
          {activeCategory === "featured" && featuredTool === "pdf-to-word" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Page Selection
                </label>
                <input
                  id="pdf-word-page-selection"
                  type="text"
                  value={pdfWordPageRange}
                  onChange={(e) => setPdfWordPageRange(e.target.value)}
                  placeholder="e.g. all or 1-5"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Type "all" for all pages or specific page numbers.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                <strong>Smart Scanned Document Detection:</strong> If the PDF lacks digital text, Smart AI automatically routes pages to our high-resolution OCR pipeline without manual intervention.
              </div>
            </div>
          )}

          {/* Existing PDF Split settings */}
          {activeCategory === "pdf" && pdfTool === "split" && (
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">Page Selection</label>
              <input
                type="text"
                value={pageSelection}
                onChange={(e) => setPageSelection(e.target.value)}
                placeholder="e.g. 1-3, or 1, 4, 5"
                className="w-full sm:w-64 px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
              />
            </div>
          )}

          {/* Existing Image Convert settings */}
          {activeCategory === "image" && imageTool === "convert" && (
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Format</label>
                <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                  {(["webp", "png", "jpeg"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setTargetFormat(fmt)}
                      className={`px-3 py-1 rounded-md uppercase font-bold text-[11px] transition-all cursor-pointer ${
                        targetFormat === fmt
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {fmt === "jpeg" ? "JPG" : fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Existing Resize settings */}
          {activeCategory === "image" && imageTool === "resize" && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={resizeWidth}
                    onChange={(e) => setResizeWidth(parseInt(e.target.value, 10) || 0)}
                    className="w-28 px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={resizeHeight}
                    onChange={(e) => setResizeHeight(parseInt(e.target.value, 10) || 0)}
                    className="w-28 px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={maintainAspect}
                  onChange={(e) => setMaintainAspect(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>Maintain aspect ratio</span>
              </label>
            </div>
          )}
        </div>

        {/* Error notification */}
        {error && (
          <div
            id="file-error-banner"
            className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Process Button */}
        <div className="pt-2 flex flex-wrap gap-3 items-center">
          <button
            id="execute-file-tool-btn"
            onClick={handleProcess}
            disabled={processing || uploadedFiles.length === 0}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>
                  {activeCategory === "featured" &&
                  (featuredTool === "jpg-to-word" || featuredTool === "pdf-to-word")
                    ? "Running Deep OCR & Generating Word File..."
                    : "Processing Binary Pipeline..."}
                </span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>
                  {activeCategory === "featured" ? (
                    featuredTool === "jpg-to-pdf"
                      ? `Convert ${uploadedFiles.length > 1 ? `${uploadedFiles.length} Images` : "Image"} to PDF`
                      : featuredTool === "pdf-to-jpg"
                      ? "Convert PDF to JPG"
                      : featuredTool === "jpg-to-word"
                      ? "Extract & Generate Word (.docx)"
                      : "Convert PDF to Word (.docx)"
                  ) : activeCategory === "image" && imageTool === "info" ? (
                    "Inspect File Properties"
                  ) : (
                    "Process & Generate File"
                  )}
                </span>
              </>
            )}
          </button>

          {uploadedFiles.length > 0 && !processing && (
            <button
              onClick={clearFiles}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Success / Download Section */}
        {successInfo && (
          <div
            id="file-success-card"
            className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  Conversion Succeeded & Verified!
                </h4>
              </div>
              {successInfo.isZip && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-1">
                  <Archive className="w-3.5 h-3.5" />
                  <span>ZIP Package</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white/70 p-3 rounded-xl border border-emerald-100">
              <div>
                <span className="text-slate-500 block text-[11px]">Original Size</span>
                <strong className="font-semibold text-slate-800">
                  {Math.round(successInfo.originalSize / 1024)} KB
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Output Size</span>
                <strong className="font-semibold text-emerald-800">
                  {Math.round(successInfo.outputSize / 1024)} KB
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Output Format</span>
                <strong className="font-mono text-slate-800 uppercase">
                  {successInfo.filename.split(".").pop()}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Verification</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Validated
                </span>
              </div>
            </div>

            {/* Specialized badges for featured tools */}
            {(successInfo.wordCount !== undefined ||
              successInfo.pageCount !== undefined ||
              successInfo.confidence !== undefined ||
              successInfo.isScanned) && (
              <div className="flex flex-wrap gap-2 text-xs">
                {successInfo.pageCount && (
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-slate-700">
                    Pages: <strong>{successInfo.pageCount}</strong>
                  </span>
                )}
                {successInfo.wordCount !== undefined && successInfo.wordCount > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-slate-700">
                    Extracted Words: <strong>{successInfo.wordCount}</strong>
                  </span>
                )}
                {successInfo.confidence !== undefined && (
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-slate-700">
                    OCR Confidence: <strong>{successInfo.confidence}%</strong>
                  </span>
                )}
                {successInfo.isScanned && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 font-semibold">
                    Scanned Document Pipeline Active
                  </span>
                )}
              </div>
            )}

            {/* Single image preview if direct JPG result */}
            {successInfo.previewUrl && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">Generated Image Preview</span>
                <div className="max-w-xs max-h-48 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <img
                    src={successInfo.previewUrl}
                    alt="Rendered page"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                id="download-processed-file-btn"
                href={successInfo.downloadUrl}
                download={successInfo.filename}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>
                  Download {successInfo.filename}
                </span>
              </a>

              <button
                id="convert-another-btn"
                onClick={clearFiles}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Convert Another File
              </button>
            </div>
          </div>
        )}

        {/* Metadata Inspector Card */}
        {imageMetadata && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              File Properties & Metadata
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Format</span>
                <span className="font-bold text-slate-900 uppercase">
                  {imageMetadata.format}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Dimensions</span>
                <span className="font-bold text-slate-900">
                  {imageMetadata.width} × {imageMetadata.height} px
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Color Space</span>
                <span className="font-bold text-slate-900">
                  {imageMetadata.space || "sRGB"}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">File Size</span>
                <span className="font-bold text-slate-900">
                  {Math.round(imageMetadata.size / 1024)} KB
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic SEO Tool Specifications, Instructions & Real FAQs */}
      <SeoToolContent
        pagePath={activeCategory === "featured" ? `/${featuredTool}` : "/file-tools"}
      />
    </div>
  );
};
