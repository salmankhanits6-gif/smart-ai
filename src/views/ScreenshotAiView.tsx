import React, { useState, useRef } from "react";
import { ScreenshotMode, ScreenshotAnalysisResult } from "../types";
import { analyzeScreenshotApi } from "../lib/api";
import { SeoToolContent } from "../components/SeoToolContent";
import {
  Camera,
  Upload,
  X,
  Sparkles,
  AlertTriangle,
  FileText,
  HelpCircle,
  MessageSquare,
  Copy,
  Check,
  RotateCcw,
  ShieldAlert,
  Info,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface ScreenshotAiViewProps {
  initialMode?: ScreenshotMode;
  onQuotaUpdate?: () => void;
}

export const ScreenshotAiView: React.FC<ScreenshotAiViewProps> = ({
  initialMode = "explain",
  onQuotaUpdate,
}) => {
  const [mode, setMode] = useState<ScreenshotMode>(initialMode);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScreenshotAnalysisResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const modesConfig: {
    id: ScreenshotMode;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "explain",
      label: "Explain Screenshot",
      description: "Explains visible screens, controls, and context in plain language.",
      icon: <HelpCircle className="w-4 h-4" />,
    },
    {
      id: "error",
      label: "Error Solver",
      description: "Identifies bugs, browser crashes, OS errors & gives step-by-step fixes.",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: "form",
      label: "Form Helper",
      description: "Explains input fields and what data is expected without inventing data.",
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: "ocr",
      label: "Text Extractor",
      description: "Extracts all visible text with high accuracy and 1-click copy.",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: "reply",
      label: "Reply Helper",
      description: "Drafts tailored replies for message or email screenshots.",
      icon: <MessageSquare className="w-4 h-4" />,
    },
  ];

  const handleFileSelect = (file: File) => {
    // Validate image format
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError("Please upload an image file (PNG, JPG, JPEG, or WEBP).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("Image size exceeds the 15MB limit.");
      return;
    }

    setError(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Read base64 for fallback
    const reader = new FileReader();
    reader.onload = () => {
      setBase64Data(reader.result as string);
    };
    reader.readAsDataURL(file);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setBase64Data(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!selectedFile && !base64Data) {
      setError("Please choose or drag a screenshot first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await analyzeScreenshotApi(selectedFile, base64Data, mode);
      setResult(data);
      if (onQuotaUpdate) onQuotaUpdate();
    } catch (err: any) {
      setError(err.message || "Smart AI could not complete this request right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper to load sample test screenshots dynamically rendered on an HTML canvas
  const loadSample = (type: "error" | "form" | "chat") => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (type === "error") {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(40, 40, 560, 6);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("Fatal Network Error: ERR_SSL_PROTOCOL_ERROR", 40, 80);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px monospace";
      ctx.fillText("Failed to load resource: net::ERR_CERT_DATE_INVALID", 40, 120);
      ctx.fillText("Target: https://api.internal-cloud.service/v2/tokens", 40, 150);
      ctx.fillText("System Clock: Desynchronized (Detected +7200s offset)", 40, 180);
      ctx.fillStyle = "#38bdf8";
      ctx.fillText("Client: Chrome/128.0.0.0 MacOS 14.5", 40, 220);
      setMode("error");
    } else if (type === "form") {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("New Vendor Registration", 40, 60);
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#475569";
      ctx.fillText("Company Legal Name *", 40, 105);
      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(40, 115, 260, 36);
      ctx.fillText("Tax Identification Number (EIN) *", 340, 105);
      ctx.strokeRect(340, 115, 260, 36);
      ctx.fillText("Primary Billing Email *", 40, 185);
      ctx.strokeRect(40, 195, 260, 36);
      ctx.fillText("VAT Exemption Certificate (Optional)", 340, 185);
      ctx.strokeRect(340, 195, 260, 36);
      setMode("form");
    } else {
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(30, 40, 420, 120);
      ctx.fillStyle = "#0f172a";
      ctx.font = "14px sans-serif";
      ctx.fillText("Alex (Product Lead):", 45, 70);
      ctx.fillStyle = "#334155";
      ctx.fillText("Hi! Can we reschedule our Q3 roadmap kickoff to", 45, 95);
      ctx.fillText("Thursday 2:00 PM EST? Let me know if that works for you.", 45, 120);
      setMode("reply");
    }

    const dataUrl = canvas.toDataURL("image/png");
    setPreviewUrl(dataUrl);
    setBase64Data(dataUrl.split(",")[1]);
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-10">
      {/* Title & Description */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
          <Camera className="w-4 h-4" />
          <span>Real Multimodal AI Analysis</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          AI Screenshot Tool & Visual Intelligence
        </h1>
        <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl">
          Upload any screenshot from your phone or computer. Smart AI uses server-side Gemini intelligence to explain screens, diagnose errors, parse forms, extract text, and propose replies.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Select Analysis Mode
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {modesConfig.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                id={`screenshot-mode-${m.id}`}
                onClick={() => setMode(m.id)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  active
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={active ? "text-blue-400" : "text-slate-500"}>
                    {m.icon}
                  </span>
                  <span className="font-semibold text-xs leading-tight">
                    {m.label}
                  </span>
                </div>
                <p className={`text-[11px] line-clamp-2 leading-relaxed ${active ? "text-slate-300" : "text-slate-500"}`}>
                  {m.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Box / Drag & Drop Area */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        {!previewUrl ? (
          <div
            id="screenshot-dropzone"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
              isDragging
                ? "border-blue-500 bg-blue-50/50"
                : "border-slate-300 hover:border-blue-400 hover:bg-slate-50/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Upload className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Drag & Drop your screenshot here, or{" "}
              <span className="text-blue-600 underline underline-offset-2">browse</span>
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              Supports PNG, JPG, JPEG, and WEBP from phones, tablets, or desktop browsers (up to 15MB).
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium">Or test with a sample:</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSample("error");
                }}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Network Error
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSample("form");
                }}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Vendor Form
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSample("chat");
                }}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Team Message
              </button>
            </div>
          </div>
        ) : (
          /* Preview and Controls */
          <div className="space-y-4">
            <div className="relative rounded-xl border border-slate-200 bg-slate-900/5 overflow-hidden max-h-96 flex items-center justify-center p-2">
              <img
                src={previewUrl}
                alt="Screenshot Preview"
                className="max-h-88 object-contain rounded-lg shadow-2xs"
              />
              <button
                id="remove-screenshot-btn"
                onClick={handleRemove}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-md transition-transform hover:scale-105 cursor-pointer"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-800">
                  {selectedFile ? selectedFile.name : "Loaded Screenshot Sample"}
                </span>
                {selectedFile && (
                  <span className="text-slate-400">
                    ({Math.round(selectedFile.size / 1024)} KB)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleRemove}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors"
                >
                  Change Image
                </button>
                <button
                  id="analyze-screenshot-btn"
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Calling Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze Screenshot</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error message if any */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Analysis Notice</p>
              <p>{error}</p>
              <button
                onClick={handleAnalyze}
                className="mt-1 underline font-semibold text-rose-900 cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Results Display */}
      {result && (
        <div id="screenshot-result-card" className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8 animate-in fade-in duration-300">
          {/* Header & Confidence Assessment */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  {result.detectedContent.contentType}
                </span>
                <span className="text-xs text-slate-400">• Mode: {result.mode}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                AI Analysis Findings
              </h2>
            </div>

            {/* Confidence indicator distinguishing facts from hypotheses */}
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Confidence:{" "}
                <strong className={
                  result.confidenceAssessment.level === "HIGH"
                    ? "text-emerald-700"
                    : result.confidenceAssessment.level === "MEDIUM"
                    ? "text-amber-700"
                    : "text-rose-700"
                }>
                  {result.confidenceAssessment.level}
                </strong>
              </span>
            </div>
          </div>

          {/* AI Summary */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Executive Summary
            </h3>
            <p className="text-sm text-blue-950 leading-relaxed font-medium">
              {result.aiSummary}
            </p>
          </div>

          {/* Detected Elements Badge List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Detected Screen Elements
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {result.detectedContent.identifiedElements.map((el, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                >
                  {el}
                </span>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Detailed Explanation
            </h4>
            <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
              {result.explanation}
            </div>
          </div>

          {/* Recommended Action */}
          {result.recommendedAction && (
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Recommended Action
              </h4>
              <p className="text-sm font-medium leading-relaxed">
                {result.recommendedAction}
              </p>
            </div>
          )}

          {/* Step-by-Step Solution (Error Solver Mode) */}
          {result.stepByStepSolution && result.stepByStepSolution.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Step-by-Step Verified Solution
              </h4>
              <ol className="space-y-2">
                {result.stepByStepSolution.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed"
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Prevention Tips */}
          {result.preventionTips && result.preventionTips.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Prevention Tips
              </h4>
              <ul className="space-y-1.5">
                {result.preventionTips.map((tip, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Form Fields Helper Mode */}
          {result.formFields && result.formFields.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Form Fields Identified ({result.formFields.length})
                </h4>
                <span className="text-[11px] text-amber-700 font-medium">
                  Notice: Smart AI never invents personal data
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.formFields.map((field, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{field.fieldName}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          field.isRequired
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {field.isRequired ? "Required" : "Optional"}
                      </span>
                    </div>
                    <p className="text-slate-600">{field.fieldPurpose}</p>
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      <strong>Expected:</strong> {field.expectedDataType}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Text Extractor / OCR Mode */}
          {result.extractedText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Transcribed Text (OCR)
                </h4>
                <button
                  onClick={() => copyToClipboard(result.extractedText!, "ocr")}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  {copiedKey === "ocr" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy Text
                    </>
                  )}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                {result.extractedText}
              </div>
            </div>
          )}

          {/* Reply Helper Mode */}
          {result.suggestedReplies && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Suggested Responses
                </h4>
                <span className="text-[11px] text-slate-400">
                  Smart AI never automatically sends messages
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(result.suggestedReplies).map(([tone, textVal]) => {
                  const replyText = String(textVal || "");
                  return (
                    <div
                      key={tone}
                      className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 flex flex-col justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 capitalize text-sm">
                            {tone} Reply
                          </span>
                          <button
                            onClick={() => copyToClipboard(replyText, tone)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                            title="Copy response"
                          >
                            {copiedKey === tone ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-slate-600 leading-relaxed italic">
                          "{replyText}"
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Distinction Banner: Confirmed Facts vs AI Hypotheses */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/60">
              <h5 className="font-bold text-emerald-900 mb-1.5 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Confirmed Visual Facts
              </h5>
              <ul className="space-y-1 text-emerald-800">
                {result.confidenceAssessment.confirmedFacts.length > 0 ? (
                  result.confidenceAssessment.confirmedFacts.map((fact, idx) => (
                    <li key={idx}>• {fact}</li>
                  ))
                ) : (
                  <li>• Image pixels directly evaluated</li>
                )}
              </ul>
            </div>

            <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/60">
              <h5 className="font-bold text-amber-900 mb-1.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-600" /> AI Suggestions & Context
              </h5>
              <ul className="space-y-1 text-amber-800">
                {result.confidenceAssessment.aiHypotheses.length > 0 ? (
                  result.confidenceAssessment.aiHypotheses.map((hyp, idx) => (
                    <li key={idx}>• {hyp}</li>
                  ))
                ) : (
                  <li>• Recommendations are guidance based on the recognized screen structure</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Structured SEO Technical Specifications, Instructions & Real FAQs */}
      <SeoToolContent pagePath="/screenshot-ai" />
    </div>
  );
};
