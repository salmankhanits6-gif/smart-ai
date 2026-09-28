import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Download,
  Check,
  RefreshCw,
  Sliders,
  Layers,
  Palette,
  AlertCircle,
  Columns,
  ShieldCheck,
  Zap,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  X,
  ChevronDown,
} from "lucide-react";
import {
  removeBackgroundApi,
  recompositeBackgroundApi,
  releaseBackgroundJobApi,
  downloadBackgroundBinaryApi,
  downloadBase64File,
} from "../lib/api";
import { BackgroundRemovalResponse } from "../types";
import { SeoToolContent } from "../components/SeoToolContent";

interface BackgroundRemoverViewProps {
  onQuotaUpdate?: () => void;
}

export type BackgroundOption =
  | "transparent"
  | "white"
  | "off-white"
  | "light-gray"
  | "sky-blue"
  | "custom_color"
  | "custom_image";

export type EdgeModeOption = "standard" | "soft" | "crisp";

export const BackgroundRemoverView: React.FC<BackgroundRemoverViewProps> = ({
  onQuotaUpdate,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Background Options (strictly includes: Transparent, White, Off-White, Light Gray, Sky Blue, Custom Color, Custom Image)
  const [bgOption, setBgOption] = useState<BackgroundOption>("transparent");
  const [customColor, setCustomColor] = useState<string>("#1e293b");
  const [customBgFile, setCustomBgFile] = useState<File | null>(null);
  const [customBgPreview, setCustomBgPreview] = useState<string | null>(null);

  // Quality, Edge Matting & Resolution Settings
  const [edgeMode, setEdgeMode] = useState<EdgeModeOption>("standard");
  const [resolutionMode, setResolutionMode] = useState<"original" | "hd" | "4k">("original");
  const [outputFormat, setOutputFormat] = useState<"png" | "jpg" | "webp">("png");

  // Output Results & Inspection
  const [removalResult, setRemovalResult] = useState<BackgroundRemovalResponse | null>(null);
  const [finalResultUrl, setFinalResultUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"slider" | "side-by-side" | "result-only">("slider");
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  // Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Synchronous references to avoid stale closure or race conditions
  const jobIdRef = useRef<string | null>(null);
  const removalResultRef = useRef<BackgroundRemovalResponse | null>(null);
  const activeJobPromiseRef = useRef<Promise<BackgroundRemovalResponse | null> | null>(null);
  const desiredBgRef = useRef<{
    opt: BackgroundOption;
    color: string;
    bgFile: File | null;
  }>({
    opt: "transparent",
    color: "#1e293b",
    bgFile: null,
  });
  const selectedFileRef = useRef<File | null>(null);

  // Keyboard shortcut: Escape exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Handle image upload from file picker or camera
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processInitialFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processInitialFile(e.dataTransfer.files[0]);
    }
  };

  // Upload and immediately trigger real AI segmentation
  const processInitialFile = (file: File) => {
    const activeJobId = jobIdRef.current || jobId;
    if (activeJobId) {
      releaseBackgroundJobApi(activeJobId);
      jobIdRef.current = null;
      setJobId(null);
    }

    setError(null);
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Please select a valid image file (JPG, PNG, or WEBP).");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("Image size exceeds the 25MB limit. Please choose a smaller photo.");
      return;
    }

    selectedFileRef.current = file;
    setSelectedFile(file);
    setZoomLevel(1);
    jobIdRef.current = null;
    removalResultRef.current = null;
    desiredBgRef.current = { opt: "transparent", color: customColor, bgFile: null };
    setRemovalResult(null);
    setFinalResultUrl(null);
    setBgOption("transparent");

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setOriginalPreview(dataUrl);
      // Auto-trigger background removal immediately on upload
      runBackgroundRemoval(file, edgeMode, resolutionMode);
    };
    reader.readAsDataURL(file);
  };

  // Run Real AI Background Removal
  const runBackgroundRemoval = async (
    file: File,
    edge: EdgeModeOption = edgeMode,
    res: "original" | "hd" | "4k" = resolutionMode
  ): Promise<BackgroundRemovalResponse | null> => {
    setIsProcessing(true);
    setError(null);
    setProcessingStatus("Uploading & analyzing image...");

    const promise = (async () => {
      try {
        const resData: BackgroundRemovalResponse = await removeBackgroundApi(file, {
          resolution: res,
          format: "png",
          edgeMode: edge,
        });
        jobIdRef.current = resData.jobId || null;
        removalResultRef.current = resData;
        setJobId(resData.jobId || null);
        setRemovalResult(resData);
        onQuotaUpdate?.();
        return resData;
      } catch (err: any) {
        setError(err.message || "Failed to remove background from image.");
        return null;
      }
    })();

    activeJobPromiseRef.current = promise;

    const timer1 = setTimeout(() => {
      setProcessingStatus("Neural AI detecting subjects & foreground...");
    }, 1200);

    const timer2 = setTimeout(() => {
      setProcessingStatus("Refining edge contours & generating alpha mask...");
    }, 3800);

    try {
      const resData = await promise;
      clearTimeout(timer1);
      clearTimeout(timer2);

      if (resData) {
        const desired = desiredBgRef.current;
        if (desired.opt !== "transparent") {
          await handleApplyBackground(desired.opt, desired.color, desired.bgFile, res, outputFormat);
        } else {
          setFinalResultUrl(resData.base64);
          setBgOption("transparent");
        }
      }
      return resData;
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      activeJobPromiseRef.current = null;
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Custom background image upload
  const handleCustomBgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomBgFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomBgPreview(event.target?.result as string);
        setBgOption("custom_image");
        handleApplyBackground("custom_image", undefined, file);
      };
      reader.readAsDataURL(file);
    }
  };

  // Ultra-fast Re-composite using server-side cached alpha mask (~30-80ms)
  const handleApplyBackground = async (
    opt?: BackgroundOption,
    color?: string,
    bgFile?: File | null,
    resMode?: "original" | "hd" | "4k",
    outFmt?: "png" | "jpg" | "webp"
  ) => {
    const chosenOption = opt !== undefined ? opt : bgOption;
    const chosenColor = color !== undefined ? color : customColor;
    const fileToUse = bgFile !== undefined ? bgFile : customBgFile;
    const chosenRes = resMode || resolutionMode;
    const chosenFmt = outFmt || outputFormat;

    desiredBgRef.current = { opt: chosenOption, color: chosenColor, bgFile: fileToUse };
    setBgOption(chosenOption);
    if (color) setCustomColor(chosenColor);

    // If initial neural removal is still running, queue the desired backdrop and wait
    if (activeJobPromiseRef.current) {
      setProcessingStatus("Generating transparent cutout, then applying your background...");
      return;
    }

    const currentJobId = jobIdRef.current || jobId || removalResultRef.current?.jobId;
    const currentForegroundBase64 = removalResultRef.current?.base64 || finalResultUrl;

    if (!currentJobId && !currentForegroundBase64) {
      if (selectedFileRef.current || selectedFile) {
        await runBackgroundRemoval(selectedFileRef.current || selectedFile!, edgeMode, chosenRes);
        return;
      }
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingStatus("Compositing background...");

    try {
      let hex = "#ffffff";
      if (chosenOption === "white") hex = "#ffffff";
      else if (chosenOption === "off-white") hex = "#f8f9fa";
      else if (chosenOption === "light-gray") hex = "#e5e7eb";
      else if (chosenOption === "sky-blue") hex = "#38bdf8";
      else hex = chosenColor;

      const res = await recompositeBackgroundApi({
        jobId: currentJobId || null,
        foregroundBase64: currentForegroundBase64 || undefined,
        backgroundType:
          chosenOption === "transparent"
            ? "transparent"
            : chosenOption === "custom_image"
            ? "custom_image"
            : "color",
        backgroundColor: hex,
        customBackgroundFile: chosenOption === "custom_image" ? fileToUse : null,
        resolution: chosenRes,
        outputFormat: chosenFmt,
      });

      setFinalResultUrl(res.base64);
      if (res.jobId) {
        jobIdRef.current = res.jobId;
        setJobId(res.jobId);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update background.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  // Edge Mode change (re-runs with new mask calibration)
  const handleEdgeModeChange = (mode: EdgeModeOption) => {
    setEdgeMode(mode);
    const file = selectedFileRef.current || selectedFile;
    if (file) {
      runBackgroundRemoval(file, mode, resolutionMode);
    }
  };

  // Real Download Handling with session recovery and instant fallback
  const handleDownload = async (
    fmt?: "png" | "jpg" | "webp",
    res?: "original" | "hd" | "4k",
    overrideBg?: BackgroundOption
  ) => {
    const chosenFmt = fmt || outputFormat;
    const chosenRes = res || resolutionMode;
    const effectiveBg = overrideBg !== undefined ? overrideBg : bgOption;
    const ext = chosenFmt === "jpg" ? "jpg" : chosenFmt === "webp" ? "webp" : "png";
    const activeJobId = jobIdRef.current || jobId || removalResultRef.current?.jobId;
    const currentForegroundBase64 = removalResultRef.current?.base64 || finalResultUrl;
    const tag = effectiveBg === "transparent" ? "transparent" : effectiveBg;
    const filename = `smart-ai-${tag}-${chosenRes !== "original" ? chosenRes + "-" : ""}${Date.now()}.${ext}`;

    setShowDownloadMenu(false);

    // If downloading current view matching format, resolution, and background, download immediately from client memory
    if (
      effectiveBg === bgOption &&
      chosenFmt === outputFormat &&
      chosenRes === resolutionMode &&
      finalResultUrl
    ) {
      downloadBase64File(finalResultUrl, filename);
      return;
    }

    // If downloading pristine transparent cutout directly and it's already in memory
    if (
      effectiveBg === "transparent" &&
      chosenFmt === "png" &&
      chosenRes === "original" &&
      removalResultRef.current?.base64
    ) {
      downloadBase64File(removalResultRef.current.base64, filename);
      return;
    }

    let hex = "#ffffff";
    if (effectiveBg === "white") hex = "#ffffff";
    else if (effectiveBg === "off-white") hex = "#f8f9fa";
    else if (effectiveBg === "light-gray") hex = "#e5e7eb";
    else if (effectiveBg === "sky-blue") hex = "#38bdf8";
    else hex = customColor;

    // Use binary download endpoint with foreground backup to gracefully restore expired sessions
    try {
      if (activeJobId || currentForegroundBase64) {
        const { blob, newJobId } = await downloadBackgroundBinaryApi({
          jobId: activeJobId,
          foregroundBase64: currentForegroundBase64 || undefined,
          backgroundType: effectiveBg,
          backgroundColor: hex,
          resolution: chosenRes,
          format: chosenFmt,
        });

        if (newJobId) {
          jobIdRef.current = newJobId;
          setJobId(newJobId);
        }

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        return;
      }
    } catch (downloadErr) {
      console.warn("Direct binary download fallback to client buffer:", downloadErr);
    }

    // Ultimate fail-safe: download rendered client base64 preview
    if (finalResultUrl) {
      downloadBase64File(finalResultUrl, filename);
    }
  };

  const handleReset = () => {
    const activeJobId = jobIdRef.current || jobId;
    if (activeJobId) {
      releaseBackgroundJobApi(activeJobId);
    }
    jobIdRef.current = null;
    removalResultRef.current = null;
    selectedFileRef.current = null;
    activeJobPromiseRef.current = null;
    desiredBgRef.current = { opt: "transparent", color: "#1e293b", bgFile: null };

    setSelectedFile(null);
    setOriginalPreview(null);
    setJobId(null);
    setRemovalResult(null);
    setFinalResultUrl(null);
    setCustomBgFile(null);
    setCustomBgPreview(null);
    setBgOption("transparent");
    setZoomLevel(1);
    setIsFullscreen(false);
    setError(null);
  };

  // Zoom controls
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  const handleResetZoom = () => setZoomLevel(1);

  // Background color swatches for quick pick
  const studioColorPresets = [
    { name: "Slate", hex: "#1e293b" },
    { name: "Warm Sand", hex: "#f5ebe0" },
    { name: "Sky Blue", hex: "#38bdf8" },
    { name: "Navy", hex: "#1e3a8a" },
    { name: "Emerald", hex: "#065f46" },
    { name: "Midnight", hex: "#0f172a" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2 border border-blue-200/70">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Real AI Subject Segmentation & Transparent PNG</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            AI Background Remover
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Accurately separate foreground subjects from backgrounds with genuine alpha edge masks.
            Original face, hair, clothing, and body pixels are 100% preserved.
          </p>
        </div>

        {selectedFile && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="reset-bg-remover-btn"
              onClick={handleReset}
              className="px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              Upload Another
            </button>

            {/* Prominent Multi-Format Download Dropdown */}
            <div className="relative">
              <button
                id="download-primary-btn"
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Result</span>
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              </button>

              {showDownloadMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 space-y-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Instant Downloads
                  </div>
                  <button
                    id="dl-transparent-png"
                    onClick={() => handleDownload("png", "original", "transparent")}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Download Transparent PNG</span>
                    <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      PNG
                    </span>
                  </button>
                  <button
                    id="dl-hd-png"
                    onClick={() => handleDownload("png", "hd")}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Download HD PNG</span>
                    <span className="text-[10px] font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700">
                      HD
                    </span>
                  </button>
                  <button
                    id="dl-jpg-backdrop"
                    onClick={() => handleDownload("jpg")}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Download JPG (Flattened)</span>
                    <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      JPG
                    </span>
                  </button>
                  <button
                    id="dl-webp-alpha"
                    onClick={() => handleDownload("webp")}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Download WebP (Lossless)</span>
                    <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      WEBP
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Processing Notice</p>
            <p className="text-rose-700 mt-0.5">{error}</p>
            <button
              onClick={() => {
                setError(null);
                if (selectedFile) runBackgroundRemoval(selectedFile);
              }}
              className="mt-2 text-xs font-bold text-rose-800 underline hover:text-rose-950 cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      {!selectedFile ? (
        /* Upload & Capture Area */
        <div className="space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-8 sm:p-14 text-center bg-white transition-all duration-200 hover:shadow-md flex flex-col items-center justify-center min-h-[380px]"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              Upload Image to Remove Background
            </h2>
            <p className="text-sm text-slate-500 max-w-lg mb-8">
              Drag and drop an image, choose from your photo gallery, or snap directly with your mobile camera.
              Supports JPG, PNG, and WebP up to 25MB.
            </p>

            {/* Action Buttons: Gallery + Camera */}
            <div className="flex flex-wrap items-center justify-center gap-4 w-full max-w-md">
              <button
                id="btn-upload-gallery"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 min-w-[170px] py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Image</span>
              </button>

              <button
                id="btn-upload-camera"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 min-w-[170px] py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Take Photo</span>
              </button>
            </div>

            {/* Hidden native inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-slate-400 mt-10">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Authentic Face & Skin
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" /> True RGBA Transparency
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> Real-time Sub-Second Compositing
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Workspace: Left Settings (4 cols) & Right Interactive Canvas (8 cols) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Controls Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Background Options (1. Transparent, 2. White, 3. Off-White, 4. Light Gray, 5. Custom Color, 6. Custom Image) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold text-slate-900">Background Replacement</h3>
                  {jobId && (
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Instant Re-composite
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Select a backdrop or upload a custom image. Composites original foreground over the new background.
                </p>
              </div>

              {/* 6 Required Background Options */}
              <div className="grid grid-cols-3 gap-2.5">
                {/* 1. Transparent */}
                <button
                  id="bg-opt-transparent"
                  onClick={() => {
                    setBgOption("transparent");
                    handleApplyBackground("transparent");
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-medium cursor-pointer ${
                    bgOption === "transparent"
                      ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg border border-slate-300 bg-checkerboard flex items-center justify-center">
                    {bgOption === "transparent" && <Check className="w-4 h-4 text-blue-600 font-bold" />}
                  </div>
                  <span>Transparent</span>
                </button>

                {/* 2. White */}
                <button
                  id="bg-opt-white"
                  onClick={() => {
                    setBgOption("white");
                    handleApplyBackground("white");
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-medium cursor-pointer ${
                    bgOption === "white"
                      ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg border border-slate-300 bg-white flex items-center justify-center shadow-2xs">
                    {bgOption === "white" && <Check className="w-4 h-4 text-slate-900 font-bold" />}
                  </div>
                  <span>White</span>
                </button>

                {/* 3. Off-White */}
                <button
                  id="bg-opt-off-white"
                  onClick={() => {
                    setBgOption("off-white");
                    handleApplyBackground("off-white");
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-medium cursor-pointer ${
                    bgOption === "off-white"
                      ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg border border-slate-300 flex items-center justify-center shadow-2xs"
                    style={{ backgroundColor: "#f8f9fa" }}
                  >
                    {bgOption === "off-white" && <Check className="w-4 h-4 text-slate-900 font-bold" />}
                  </div>
                  <span>Off-White</span>
                </button>

                {/* 4. Light Gray */}
                <button
                  id="bg-opt-light-gray"
                  onClick={() => {
                    setBgOption("light-gray");
                    handleApplyBackground("light-gray");
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-medium cursor-pointer ${
                    bgOption === "light-gray"
                      ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg border border-slate-300 flex items-center justify-center shadow-2xs"
                    style={{ backgroundColor: "#e5e7eb" }}
                  >
                    {bgOption === "light-gray" && <Check className="w-4 h-4 text-slate-900 font-bold" />}
                  </div>
                  <span>Light Gray</span>
                </button>

                {/* 5. Sky Blue */}
                <button
                  id="bg-opt-sky-blue"
                  onClick={() => {
                    setBgOption("sky-blue");
                    handleApplyBackground("sky-blue");
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-medium cursor-pointer ${
                    bgOption === "sky-blue"
                      ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg border border-sky-400 flex items-center justify-center shadow-2xs"
                    style={{ backgroundColor: "#38bdf8" }}
                  >
                    {bgOption === "sky-blue" && <Check className="w-4 h-4 text-white font-bold drop-shadow" />}
                  </div>
                  <span>Sky Blue</span>
                </button>

                {/* 6. Custom Color */}
                <button
                  id="bg-opt-custom-color"
                  onClick={() => {
                    setBgOption("custom_color");
                    handleApplyBackground("custom_color", customColor);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-medium cursor-pointer ${
                    bgOption === "custom_color"
                      ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shadow-2xs border border-black/15 text-white"
                    style={{ backgroundColor: customColor }}
                  >
                    <Palette className="w-4 h-4 drop-shadow" />
                  </div>
                  <span>Custom</span>
                </button>

                {/* 7. Custom Background Image */}
                <button
                  id="bg-opt-custom-image"
                  onClick={() => bgImageInputRef.current?.click()}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-medium cursor-pointer ${
                    bgOption === "custom_image"
                      ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span>Add Image</span>
                </button>
              </div>

              {/* Hidden input for custom background image */}
              <input
                ref={bgImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleCustomBgSelect}
              />

              {/* Custom Color Picker & Swatches */}
              {bgOption === "custom_color" && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                    />
                    <div className="flex-1">
                      <span className="text-[11px] text-slate-500 block font-medium">Hex Color Code</span>
                      <input
                        type="text"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="text-xs font-mono font-bold text-slate-800 uppercase bg-transparent border-0 p-0 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handleApplyBackground("custom_color", customColor)}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {/* Studio Swatches */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Presets:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {studioColorPresets.map((swatch) => (
                        <button
                          key={swatch.hex}
                          onClick={() => {
                            setCustomColor(swatch.hex);
                            handleApplyBackground("custom_color", swatch.hex);
                          }}
                          className="w-5 h-5 rounded-md border border-slate-300 shadow-2xs hover:scale-110 transition-transform cursor-pointer"
                          style={{ backgroundColor: swatch.hex }}
                          title={swatch.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Background Image Preview Box */}
              {bgOption === "custom_image" && customBgPreview && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <img
                    src={customBgPreview}
                    alt="Custom Background"
                    className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-slate-800 truncate block">
                      {customBgFile?.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {Math.round((customBgFile?.size || 0) / 1024)} KB
                    </span>
                  </div>
                  <button
                    onClick={() => bgImageInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 border border-slate-200 rounded-lg hover:bg-white transition-colors cursor-pointer"
                  >
                    Swap
                  </button>
                </div>
              )}

              {/* Edge Refinement Selector */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Edge Refinement & Matting
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "standard", label: "Standard", desc: "Balanced" },
                    { id: "soft", label: "Soft Hair", desc: "Flyaways & Fur" },
                    { id: "crisp", label: "Crisp", desc: "Hard Objects" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleEdgeModeChange(item.id as EdgeModeOption)}
                      className={`p-2 text-center rounded-xl border transition-all cursor-pointer ${
                        edgeMode === item.id
                          ? "border-blue-600 bg-blue-50/70 text-blue-900 font-semibold"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-xs block font-bold">{item.label}</span>
                      <span className="text-[10px] text-slate-400 block">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution & Format Options */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    Resolution Quality
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["original", "hd", "4k"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setResolutionMode(mode);
                          handleApplyBackground(bgOption, customColor, customBgFile, mode, outputFormat);
                        }}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          resolutionMode === mode
                            ? "border-blue-600 bg-blue-600 text-white shadow-2xs"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {mode === "original" ? "Original (1:1)" : mode.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    Export Format
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["png", "jpg", "webp"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => {
                          setOutputFormat(fmt);
                          handleApplyBackground(bgOption, customColor, customBgFile, resolutionMode, fmt);
                        }}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border uppercase transition-all cursor-pointer ${
                          outputFormat === fmt
                            ? "border-blue-600 bg-blue-600 text-white shadow-2xs"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                  {outputFormat === "jpg" && bgOption === "transparent" && (
                    <p className="text-[11px] text-amber-600 mt-1.5">
                      Note: JPG format does not support transparency; a clean white studio backdrop is automatically applied.
                    </p>
                  )}
                </div>
              </div>

              {/* Working Download Buttons (Transparent PNG, HD PNG, JPG, WebP) */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Export Files
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-dl-trans-png"
                    onClick={() => handleDownload("png", "original", "transparent")}
                    className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Transparent PNG</span>
                  </button>

                  <button
                    id="btn-dl-hd-png"
                    onClick={() => handleDownload("png", "hd")}
                    className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>HD PNG</span>
                  </button>

                  <button
                    id="btn-dl-jpg"
                    onClick={() => handleDownload("jpg")}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JPG</span>
                  </button>

                  <button
                    id="btn-dl-webp"
                    onClick={() => handleDownload("webp")}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download WebP</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Interactive Preview & Comparison Canvas */}
          <div className="lg:col-span-8 space-y-4">
            {/* View Mode & Zoom Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              {/* View Switcher: Slider / Side-by-Side / Result Only */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  id="tab-slider"
                  onClick={() => setActiveTab("slider")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === "slider"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Before / After Slider</span>
                </button>

                <button
                  id="tab-side-by-side"
                  onClick={() => setActiveTab("side-by-side")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === "side-by-side"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Columns className="w-3.5 h-3.5 text-blue-600" />
                  <span>Side-by-Side</span>
                </button>

                <button
                  id="tab-result-only"
                  onClick={() => setActiveTab("result-only")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === "result-only"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cutout Only</span>
                </button>
              </div>

              {/* Zoom & Fullscreen Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 1}
                    className="p-1.5 rounded-lg text-slate-700 hover:bg-white disabled:opacity-40 transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-slate-700 px-1.5">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 3}
                    className="p-1.5 rounded-lg text-slate-700 hover:bg-white disabled:opacity-40 transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  {zoomLevel > 1 && (
                    <button
                      onClick={handleResetZoom}
                      className="text-[10px] text-blue-600 hover:underline px-1 font-semibold cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <button
                  id="btn-fullscreen-toggle"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
                  title="Fullscreen Preview"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Display Canvas with Loading State Overlay */}
            <div
              ref={previewContainerRef}
              className="relative bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm min-h-[460px] flex items-center justify-center overflow-hidden"
            >
              {/* Real Processing Spinner Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 z-30 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-inner">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-1">
                    AI Neural Segmentation Active
                  </h4>
                  <p className="text-xs text-slate-600 max-w-sm">
                    {processingStatus || "Processing high-precision alpha mask..."}
                  </p>
                </div>
              )}

              {/* Content Modes */}
              {!finalResultUrl ? (
                /* Uploaded preview, waiting for initial processing */
                <div className="max-h-[480px] w-full flex items-center justify-center">
                  {originalPreview && (
                    <img
                      src={originalPreview}
                      alt="Original Input"
                      className="max-h-[460px] w-auto object-contain rounded-2xl border border-slate-100 shadow-sm"
                    />
                  )}
                </div>
              ) : activeTab === "slider" ? (
                /* Interactive Before / After Slider */
                <div className="w-full flex flex-col items-center">
                  <div
                    className={`relative w-full h-[420px] sm:h-[500px] rounded-2xl overflow-hidden select-none border border-slate-200 shadow-inner ${
                      bgOption === "transparent" ? "bg-checkerboard" : "bg-slate-100"
                    }`}
                  >
                    {/* Zoomable Container */}
                    <div
                      className="w-full h-full relative"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: "center center",
                        transition: "transform 0.15s ease-out",
                      }}
                    >
                      {/* Under layer: Processed Result */}
                      {finalResultUrl && (
                        <img
                          src={finalResultUrl}
                          alt="Processed Foreground"
                          className="absolute inset-0 w-full h-full object-contain p-2"
                        />
                      )}

                      {/* Over layer: Original Image clipped precisely by sliderPosition */}
                      {originalPreview && (
                        <div
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                        >
                          <img
                            src={originalPreview}
                            alt="Original Image"
                            className="w-full h-full object-contain p-2"
                          />
                        </div>
                      )}

                      {/* Vertical Divider Handle */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 cursor-ew-resize flex items-center justify-center"
                        style={{ left: `${sliderPosition}%` }}
                      >
                        <div className="w-8 h-8 rounded-full bg-white shadow-md border border-slate-300 flex items-center justify-center text-slate-700">
                          <Sliders className="w-3.5 h-3.5 text-blue-600 rotate-90" />
                        </div>
                      </div>
                    </div>

                    {/* Range Input for smooth sliding */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sliderPosition}
                      onChange={(e) => setSliderPosition(Number(e.target.value))}
                      className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-20"
                    />
                  </div>

                  <div className="w-full flex justify-between items-center text-xs text-slate-500 mt-3 px-2">
                    <span className="font-semibold text-slate-600">← Original Photo</span>
                    <span className="text-[11px] bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-600 font-medium">
                      Drag slider to inspect hair and edges
                    </span>
                    <span className="font-semibold text-blue-600">Processed Cutout →</span>
                  </div>
                </div>
              ) : activeTab === "side-by-side" ? (
                /* Side by Side View */
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Image */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Original Image</span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                        Source
                      </span>
                    </div>
                    <div className="h-[380px] sm:h-[440px] rounded-xl overflow-hidden bg-white flex items-center justify-center border border-slate-200 p-2">
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          transform: `scale(${zoomLevel})`,
                          transformOrigin: "center center",
                          transition: "transform 0.15s ease-out",
                        }}
                      >
                        {originalPreview && (
                          <img
                            src={originalPreview}
                            alt="Original"
                            className="max-h-full max-w-full object-contain"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cutout Result */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span className="text-blue-600 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Cutout Result
                      </span>
                      <span className="text-[10px] uppercase font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {bgOption.replace("_", " ")}
                      </span>
                    </div>
                    <div
                      className={`h-[380px] sm:h-[440px] rounded-xl overflow-hidden ${
                        bgOption === "transparent" ? "bg-checkerboard" : "bg-white"
                      } flex items-center justify-center border border-slate-200 p-2`}
                    >
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          transform: `scale(${zoomLevel})`,
                          transformOrigin: "center center",
                          transition: "transform 0.15s ease-out",
                        }}
                      >
                        {finalResultUrl && (
                          <img
                            src={finalResultUrl}
                            alt="Cutout Result"
                            className="max-h-full max-w-full object-contain"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Cutout Only View */
                <div className="w-full flex flex-col items-center">
                  <div
                    className={`relative w-full h-[420px] sm:h-[500px] rounded-2xl overflow-hidden ${
                      bgOption === "transparent" ? "bg-checkerboard" : "bg-slate-100"
                    } border border-slate-200 shadow-inner flex items-center justify-center p-2`}
                  >
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: "center center",
                        transition: "transform 0.15s ease-out",
                      }}
                    >
                      {finalResultUrl && (
                        <img
                          src={finalResultUrl}
                          alt="Isolated Subject"
                          className="max-h-full max-w-full object-contain"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dimensional Metadata & Transparency Assurance */}
            {removalResult && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    True RGBA Output • {removalResult.width} × {removalResult.height} px •{" "}
                    {Math.round(removalResult.outputSize / 1024)} KB
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  Preserved 1:1 original source coordinates
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col p-4 sm:p-6 text-white animate-in fade-in duration-200">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm sm:text-base">Inspection Canvas</span>
              <span className="text-xs text-slate-400">
                {removalResult?.width} × {removalResult?.height} px
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Fullscreen Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded-xl">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 1}
                  className="p-1 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono px-2">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3}
                  className="p-1 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                {zoomLevel > 1 && (
                  <button
                    onClick={handleResetZoom}
                    className="text-xs text-blue-400 hover:underline ml-1 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Direct Download in Fullscreen */}
              <button
                onClick={() => handleDownload("png")}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>

              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Exit Fullscreen (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Center Viewport */}
          <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center p-4">
            <div
              className={`relative w-full h-full rounded-xl overflow-hidden select-none flex items-center justify-center ${
                bgOption === "transparent" ? "bg-checkerboard" : "bg-slate-900"
              }`}
            >
              <div
                className="w-full h-full relative"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                }}
              >
                {/* Result */}
                {finalResultUrl && (
                  <img
                    src={finalResultUrl}
                    alt="Processed"
                    className="absolute inset-0 w-full h-full object-contain p-2"
                  />
                )}

                {/* Original Slider if in slider mode */}
                {activeTab === "slider" && originalPreview && (
                  <div
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                  >
                    <img
                      src={originalPreview}
                      alt="Original"
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                )}

                {activeTab === "slider" && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl z-10 flex items-center justify-center"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="w-8 h-8 rounded-full bg-white shadow-lg border border-slate-400 flex items-center justify-center text-slate-800">
                      <Sliders className="w-3.5 h-3.5 text-blue-600 rotate-90" />
                    </div>
                  </div>
                )}
              </div>

              {activeTab === "slider" && (
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-20"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Structured SEO Technical Specifications, Instructions & Real FAQs */}
      <SeoToolContent pagePath="/image-background-remover" />
    </div>
  );
};
