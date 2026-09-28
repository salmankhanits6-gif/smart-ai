import React, { useState } from "react";
import { SEO_PAGES, SeoPageConfig } from "../lib/seoData";
import { ViewType } from "../types";
import {
  HelpCircle,
  ShieldCheck,
  FileCheck,
  Cpu,
  ChevronDown,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface SeoToolContentProps {
  pagePath: string;
  onNavigate?: (view: ViewType, options?: any) => void;
}

export const SeoToolContent: React.FC<SeoToolContentProps> = ({ pagePath, onNavigate }) => {
  const page: SeoPageConfig | undefined = SEO_PAGES[pagePath];
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  if (!page) return null;

  const handleLinkClick = (e: React.MouseEvent, targetPath: string) => {
    if (onNavigate) {
      e.preventDefault();
      const targetConfig = SEO_PAGES[targetPath];
      if (targetConfig) {
        onNavigate(targetConfig.view, { fileTool: targetConfig.subtool });
      } else {
        window.location.href = targetPath;
      }
    }
  };

  return (
    <section className="mt-16 pt-12 border-t border-slate-200 text-slate-800 space-y-12 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Intro Context Block */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-200/60">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>{page.badge}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-3">
          About the {page.h1}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          {page.introParagraph}
        </p>
      </div>

      {/* How It Works / Steps */}
      <div>
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
            <FileCheck className="w-4 h-4" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            How to Use {page.h1}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {page.howToSteps.map((step) => (
            <div
              key={step.stepNumber}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center mb-3">
                  {step.stepNumber}
                </div>
                <h3 className="font-semibold text-slate-900 text-sm mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supported Formats and Technical Limits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formats */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>Supported Formats & Capabilities</span>
          </h2>
          <ul className="space-y-3 text-xs">
            {page.supportedFormats.map((fmt, i) => (
              <li key={i} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="flex items-center justify-between font-semibold text-slate-800 mb-1">
                  <span>{fmt.category}</span>
                  <span className="text-blue-600 font-mono text-[11px] bg-blue-50 px-2 py-0.5 rounded">
                    {fmt.formats.join(", ")}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px]">{fmt.note}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Technical Architecture & Honest Limitations */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              <span>Technical Specifications & Architecture</span>
            </h2>
            <ul className="space-y-2.5 text-xs text-slate-700 mb-4">
              {page.technicalSpecifications.map((spec, i) => (
                <li key={i} className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 font-medium">{spec.label}:</span>
                  <span className="font-semibold text-slate-800 text-right">{spec.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900">
            <span className="font-bold block mb-1">Notice & Capacity Guidelines:</span>
            <ul className="list-disc pl-4 space-y-1 text-amber-800/90">
              {page.limitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-bold text-white mb-1">
              Zero Permanent Storage Commitment
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              {page.privacyCommitment}
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-xs text-emerald-400 font-medium bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
          <span>In-Memory Only</span>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div>
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
            <HelpCircle className="w-4 h-4" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {page.faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 mt-1">
                    <p className="pt-2">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Related Smart AI Tools */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-4">
          Related Smart AI Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {page.relatedTools.map((tool, i) => (
            <a
              key={i}
              href={tool.path}
              onClick={(e) => handleLinkClick(e, tool.path)}
              className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 transition-all hover:shadow-xs group flex flex-col justify-between"
            >
              <div>
                <span className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors flex items-center justify-between">
                  <span>{tool.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-600" />
                </span>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {tool.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
