import React from "react";
import { ViewType, ScreenshotMode } from "../types";
import {
  Camera,
  FileBox,
  ShieldAlert,
  ArrowRight,
  Lock,
  Zap,
  CheckCircle,
  FileText,
  Wrench,
  Search,
  MessageSquare,
  ShieldCheck,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import { SeoToolContent } from "../components/SeoToolContent";

interface HomeViewProps {
  onNavigate: (view: ViewType, options?: { mode?: ScreenshotMode; scamTab?: "message" | "url" }) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-20 py-8 md:py-14">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto text-center px-4 sm:px-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-6 border border-blue-200/70 shadow-2xs">
          <Zap className="w-3.5 h-3.5 text-blue-600" />
          <span>Real Working AI Utilities • No Mockups • Zero Data Selling</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12] mb-6">
          One Smart Place for Everyday{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Digital Problems.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto mb-10 font-normal">
          Understand screenshots, convert files, and check suspicious messages and links with powerful AI-powered tools.
        </p>

        {/* Hero Quick Privacy Ribbon */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-100/90 border border-slate-200 text-xs text-slate-700 font-medium">
          <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Your files are processed securely. We never sell your personal content.</span>
        </div>
      </section>

      {/* 3 Primary Tool Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Card 1: Screenshot AI */}
          <div className="relative rounded-2xl bg-white p-7 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-13 h-13 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Camera className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-1">
                Visual Intelligence
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                📸 Screenshot AI
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Upload a screenshot and let Smart AI explain what you’re seeing. Includes error diagnostics, form assistance, verbatim text extraction, and suggested replies.
              </p>
              <ul className="space-y-2 text-xs text-slate-500 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" /> Error solver with verified step-by-step fix
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" /> Form field explanation (no invented data)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" /> Exact OCR extraction with 1-click copy
                </li>
              </ul>
            </div>
            <a
              href="/screenshot-ai"
              id="hero-btn-screenshot-ai"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("screenshot-ai");
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer group-hover:bg-blue-600"
            >
              <span>Analyze Screenshot</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Card 2: File Tools */}
          <div className="relative rounded-2xl bg-white p-7 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <FileBox className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                Real Processing Engine
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                📄 File Tools
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Convert, compress, merge, split, and manage your everyday files. Real binary conversions that actually create output files without distortions or quality loss.
              </p>
              <ul className="space-y-2 text-xs text-slate-500 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> JPG → PDF (reorder & preserve aspect ratio)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> PDF → JPG (render high-res pages & ZIP)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> JPG → Word (Real OCR into editable .docx)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> PDF → Word (Digital flow + Scanned OCR)
                </li>
              </ul>
            </div>
            <a
              href="/file-tools"
              id="hero-btn-file-tools"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("file-tools");
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer group-hover:bg-emerald-600"
            >
              <span>Open File Tools</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Card 3: Scam Checker */}
          <div className="relative rounded-2xl bg-white p-7 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-13 h-13 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 block mb-1">
                Safety & Threat Analysis
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                🛡️ Scam Checker
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Check suspicious messages, emails, and links for warning signs. Evaluates urgent pressure, OTP/password traps, domain look-alikes, and provides practical defense steps.
              </p>
              <ul className="space-y-2 text-xs text-slate-500 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-rose-500" /> Risk Score (0–100) & Level badges
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-rose-500" /> URL technical signal & homograph scan
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-rose-500" /> Practical, actionable safety tips
                </li>
              </ul>
            </div>
            <a
              href="/scam-checker"
              id="hero-btn-scam-checker"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("scam-checker");
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-rose-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer group-hover:bg-rose-600"
            >
              <span>Check for Scam</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Featured Tool: Background Remover */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
            Featured Tool
          </span>
          <h2 className="text-xl font-bold text-slate-900">
            AI Background Remover & HD Replacement
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Background Remover Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Eye className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                  HD & 4K Output
                </span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                AI Background Remover & HD Replacement
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Accurately segment people and subjects with crisp alpha transparency. Replace backdrops with transparent cutout, pure studio colors, or custom background photos while preserving authentic hair, face, and clothing details.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-6">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" /> Transparent Alpha PNG
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" /> Solid Color & Photo Backdrop
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" /> Before/After Slider View
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" /> Zero Facial Replacement
                </div>
              </div>
            </div>
            <a
              href="/image-background-remover"
              id="home-btn-bg-remover"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("background-remover");
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Launch Background Remover</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Discovery Section: What can Smart AI do? */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
            What can Smart AI do?
          </h2>
          <p className="text-slate-600 text-sm">
            Instant utilities designed for real tasks you face every day on your phone or computer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Understand a Screenshot */}
          <a
            href="/screenshot-ai"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("screenshot-ai", { mode: "explain" });
            }}
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group block text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">📸</span>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                Understand a Screenshot
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Don't know what an app or website screen is asking for? Get a clear, jargon-free breakdown.
            </p>
            <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Launch tool <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </a>

          {/* 2. Convert a File */}
          <a
            href="/file-tools"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("file-tools");
            }}
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group block text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">📄</span>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-600 transition-colors">
                Convert a File
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Real binary conversion between JPG, PNG, WEBP, and PDF. Compress and merge with full quality controls.
            </p>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Launch tool <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </a>

          {/* 3. Check a Suspicious Message */}
          <a
            href="/scam-checker"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("scam-checker", { scamTab: "message" });
            }}
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer group block text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">🛡️</span>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-rose-600 transition-colors">
                Check a Suspicious Message
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Paste odd SMS, WhatsApp texts, or emails to detect pressure, impersonation, or fake prize indicators.
            </p>
            <span className="text-xs font-semibold text-rose-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Launch tool <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </a>

          {/* 4. Analyze a Link */}
          <a
            href="/scam-checker"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("scam-checker", { scamTab: "url" });
            }}
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer group block text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">🔗</span>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-amber-600 transition-colors">
                Analyze a Link
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Inspect suspicious URLs for deceptive domain chaining, IDN homoglyphs, and unencrypted transmission.
            </p>
            <span className="text-xs font-semibold text-amber-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Launch tool <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </a>

          {/* 5. Extract Text */}
          <a
            href="/screenshot-ai"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("screenshot-ai", { mode: "ocr" });
            }}
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer group block text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">📝</span>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-purple-600 transition-colors">
                Extract Text
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Capture text locked inside receipts, code editors, error dialogs, or mobile apps with instant copy.
            </p>
            <span className="text-xs font-semibold text-purple-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Launch tool <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </a>

          {/* 6. Solve an Error */}
          <a
            href="/screenshot-ai"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("screenshot-ai", { mode: "error" });
            }}
            className="p-5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group block text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">⚙️</span>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                Solve an Error
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Upload any system, app, or browser crash error message for an exact explanation and practical steps to fix it.
            </p>
            <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Launch tool <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </a>
        </div>
      </section>

      {/* Trust Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-3xl mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block mb-2">
              Our Core Principles
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-4">
              Built for everyday digital problems.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              We built Smart AI to give everyday computer and phone users honest, dependable utilities without misleading ads, subscription traps, or privacy violations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-800">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center font-bold text-sm">
                  01
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                  Unlimited
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Private</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your files should not be permanently stored unnecessarily. All operations run in volatile memory and are cleaned immediately.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/60 flex items-center justify-center font-bold text-sm">
                  02
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/60">
                  Unlimited
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Practical</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Smart AI gives useful, actionable results instead of complicated, overwhelming essays or artificial jargon.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-purple-950 text-purple-400 border border-purple-800/60 flex items-center justify-center font-bold text-sm">
                  03
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-400 border border-purple-800/60">
                  Unlimited
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Transparent</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Smart AI clearly tells users when a result is uncertain. We never make fake 100% safety guarantees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Structured SEO Technical Specifications, Platform Guides & Real FAQs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SeoToolContent pagePath="/" />
      </div>
    </div>
  );
};
