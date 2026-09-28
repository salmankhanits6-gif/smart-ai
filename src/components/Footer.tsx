import React from "react";
import { ViewType } from "../types";
import { Sparkles, Shield, Lock, Cpu } from "lucide-react";
import { SEO_PAGES } from "../lib/seoData";

interface FooterProps {
  onNavigate: (view: ViewType, options?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    const config = SEO_PAGES[path];
    if (config) {
      onNavigate(config.view, { fileTool: config.subtool });
    } else {
      window.location.href = path;
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-sm">
      {/* Privacy Guarantee Ribbon */}
      <div className="bg-slate-950/60 border-b border-slate-800/80 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Privacy Commitment:</strong> Files are processed exclusively in volatile memory and purged immediately. Zero permanent cloud file storage.
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" /> Server-side API protection
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> Powered by Gemini
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <a
              href="/"
              onClick={(e) => handleLinkClick(e, "/")}
              className="flex items-center gap-2.5 text-white font-bold text-lg inline-flex"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span>Smart AI</span>
            </a>
            <p className="text-xs text-slate-400 leading-relaxed">
              Everyday digital utility platform. Remove backgrounds, convert files, analyze screenshots with AI, and verify scam threats with genuine server-side intelligence.
            </p>
            <p className="text-[11px] text-amber-300/80 bg-amber-950/30 p-2.5 rounded-md border border-amber-800/40">
              Notice: Do not upload passwords, private cryptographic keys, financial PINs, or confidential credentials.
            </p>
          </div>

          {/* Col 2: Converters */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
              Image & Document Tools
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="/image-background-remover"
                  onClick={(e) => handleLinkClick(e, "/image-background-remover")}
                  className="hover:text-white transition-colors"
                >
                  AI Background Remover
                </a>
              </li>
              <li>
                <a
                  href="/jpg-to-pdf"
                  onClick={(e) => handleLinkClick(e, "/jpg-to-pdf")}
                  className="hover:text-white transition-colors"
                >
                  JPG to PDF Converter
                </a>
              </li>
              <li>
                <a
                  href="/pdf-to-jpg"
                  onClick={(e) => handleLinkClick(e, "/pdf-to-jpg")}
                  className="hover:text-white transition-colors"
                >
                  PDF to JPG Converter
                </a>
              </li>
              <li>
                <a
                  href="/jpg-to-word"
                  onClick={(e) => handleLinkClick(e, "/jpg-to-word")}
                  className="hover:text-white transition-colors"
                >
                  JPG to Word Converter
                </a>
              </li>
              <li>
                <a
                  href="/png-to-word"
                  onClick={(e) => handleLinkClick(e, "/png-to-word")}
                  className="hover:text-white transition-colors"
                >
                  PNG to Word Converter
                </a>
              </li>
              <li>
                <a
                  href="/pdf-to-word"
                  onClick={(e) => handleLinkClick(e, "/pdf-to-word")}
                  className="hover:text-white transition-colors"
                >
                  PDF to Word Converter
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: AI & Security */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
              AI & Security Tools
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="/screenshot-ai"
                  onClick={(e) => handleLinkClick(e, "/screenshot-ai")}
                  className="hover:text-white transition-colors"
                >
                  Screenshot AI Analyzer
                </a>
              </li>
              <li>
                <a
                  href="/scam-checker"
                  onClick={(e) => handleLinkClick(e, "/scam-checker")}
                  className="hover:text-white transition-colors"
                >
                  AI Scam & SMS Checker
                </a>
              </li>
              <li>
                <a
                  href="/file-tools"
                  onClick={(e) => handleLinkClick(e, "/file-tools")}
                  className="hover:text-white transition-colors"
                >
                  Full File Tools Suite
                </a>
              </li>
              <li>
                <a
                  href="/pricing"
                  onClick={(e) => handleLinkClick(e, "/pricing")}
                  className="hover:text-white transition-colors"
                >
                  Pricing & Free Daily Limits
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform & Legal */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
              Platform & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="/about"
                  onClick={(e) => handleLinkClick(e, "/about")}
                  className="hover:text-white transition-colors"
                >
                  About Smart AI
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  onClick={(e) => handleLinkClick(e, "/privacy")}
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  onClick={(e) => handleLinkClick(e, "/terms")}
                  className="hover:text-white transition-colors"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} Smart AI. Understand. Convert. Stay Safe. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a
              href="/privacy"
              onClick={(e) => handleLinkClick(e, "/privacy")}
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              onClick={(e) => handleLinkClick(e, "/terms")}
              className="hover:text-white transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="/about"
              onClick={(e) => handleLinkClick(e, "/about")}
              className="hover:text-white transition-colors"
            >
              About
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
