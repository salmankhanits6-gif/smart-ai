import React from "react";
import { ViewType } from "../types";
import {
  Sparkles,
  Shield,
  Lock,
  Cpu,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface AboutViewProps {
  onNavigate: (view: ViewType) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-12">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Our Mission</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Dependable Utilities for Everyday People
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
          Smart AI was built to solve a simple frustration: everyday computer and smartphone tasks shouldn't require sketchy ad-infested software, predatory subscription traps, or handing over your private files to unknown third parties.
        </p>
      </div>

      {/* The 3 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            1
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Understand</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Screenshots are how modern people share technical confusion. Smart AI breaks down error dialogs, foreign language forms, and complex interfaces into plain, actionable advice.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            2
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Convert</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Real file operations done right. No fake progress bars, watermarks, or distorted images. Real binary processing for PDFs and modern image formats directly on the server.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            3
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Stay Safe</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Online scams exploit fear, urgency, and technical confusion. Our scam checker provides objective indicators to protect users before they click or send money.
          </p>
        </div>
      </div>

      {/* Technical Philosophy */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 space-y-6">
        <h2 className="text-2xl font-bold">Our Technical Commitment</h2>
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong className="text-white">Zero File Archival:</strong> Files uploaded to Smart AI are buffered exclusively in volatile RAM to execute the requested operation. Once processed and streamed back to your browser, memory buffers are released. We do not maintain a permanent database of user documents.
          </p>
          <p>
            <strong className="text-white">Server-Side Security:</strong> All intelligence calls use server-side credentials with strict sanitization. Your browser never touches raw API tokens, and executable files are blocked at the perimeter.
          </p>
          <p>
            <strong className="text-white">Honest AI Limitations:</strong> When an image is blurry, or an error is ambiguous, Smart AI explicitly highlights low confidence rather than fabricating answers.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-4">
        <button
          onClick={() => onNavigate("screenshot-ai")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-xs"
        >
          <span>Try Smart AI Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
