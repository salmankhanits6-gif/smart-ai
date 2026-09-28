import React from "react";
import { Check, Zap, Shield, Sparkles, Clock } from "lucide-react";
import { ViewType } from "../types";

interface PricingViewProps {
  onNavigate: (view: ViewType) => void;
  onOpenAccount: () => void;
}

export const PricingView: React.FC<PricingViewProps> = ({ onNavigate, onOpenAccount }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-12">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-4 border border-blue-200">
          <Zap className="w-3.5 h-3.5" />
          <span>Simple, Honest Plans</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Transparent Daily Access
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Smart AI is committed to keeping essential everyday digital tools accessible without predatory paywalls or unexpected subscription traps.
        </p>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <div className="rounded-2xl border-2 border-slate-900 bg-white p-8 shadow-sm flex flex-col justify-between relative">
          <div className="absolute -top-3.5 left-8 px-3 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
            Current Tier • Active Now
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Standard Free</h3>
                <p className="text-xs text-slate-500 mt-0.5">Essential everyday digital tools</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-slate-900">$0</span>
                <span className="text-xs text-slate-500 block">forever free</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed pb-6 border-b border-slate-100">
              Immediate access with no credit card required. Perfect for personal problem-solving and daily file management.
            </p>

            <ul className="py-6 space-y-3 text-xs text-slate-700">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>5 Screenshot AI analyses</strong> per day (all 5 modes)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>10 Scam & URL checks</strong> per day</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>20 File & PDF conversions</strong> per day</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Up to 15MB file upload limit</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Strict in-memory volatile privacy processing</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Optional free account for elevated quotas (25/50/100 ops)</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => onNavigate("screenshot-ai")}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Start Using Free Tools
          </button>
        </div>

        {/* Pro Plan (Coming Soon) */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-8 flex flex-col justify-between relative">
          <div className="absolute -top-3.5 left-8 px-3 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold uppercase tracking-wider border border-blue-200">
            Pro • Coming Soon
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Smart AI Pro</h3>
                <p className="text-xs text-slate-500 mt-0.5">High-volume workflows & businesses</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-slate-400">TBA</span>
                <span className="text-xs text-slate-400 block">no charges now</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed pb-6 border-b border-slate-200">
              Designed for power users, support teams, and legal reviewers needing high limits and large batch processing.
            </p>

            <ul className="py-6 space-y-3 text-xs text-slate-600">
              <li className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                <span><strong>Unlimited</strong> Screenshot AI, OCR & error solving</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                <span><strong>Unlimited</strong> Scam Message & URL inspections</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                <span><strong>Batch file processing</strong> (up to 50 files simultaneously)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Large file allowance up to 100MB per file</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Priority inference queues for instant response times</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Direct export to CSV, JSON, and searchable PDF</span>
              </li>
            </ul>
          </div>

          <button
            onClick={onOpenAccount}
            className="w-full py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Create Account for Free Quota Boost
          </button>
        </div>
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-slate-600">
            <strong>No Hidden Billing:</strong> We never charge without your explicit consent. All free tier limits reset daily at midnight UTC.
          </span>
        </div>
        <button
          onClick={() => onNavigate("privacy")}
          className="text-blue-600 font-semibold hover:underline shrink-0"
        >
          Read Privacy Guarantees
        </button>
      </div>
    </div>
  );
};
