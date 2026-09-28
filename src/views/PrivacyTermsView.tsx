import React, { useState } from "react";
import { Lock, Shield, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";

interface PrivacyTermsViewProps {
  initialTab?: "privacy" | "terms";
}

export const PrivacyTermsView: React.FC<PrivacyTermsViewProps> = ({
  initialTab = "privacy",
}) => {
  const [tab, setTab] = useState<"privacy" | "terms">(initialTab);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-10">
      {/* Tab Switcher */}
      <div className="flex rounded-xl bg-slate-100 p-1 max-w-xs border border-slate-200">
        <button
          onClick={() => setTab("privacy")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            tab === "privacy"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Privacy Policy
        </button>
        <button
          onClick={() => setTab("terms")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            tab === "terms"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Terms of Service
        </button>
      </div>

      {tab === "privacy" ? (
        /* PRIVACY POLICY */
        <div className="space-y-8 bg-white p-8 rounded-2xl border border-slate-200 text-slate-700 text-sm leading-relaxed shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">
              <Lock className="w-4 h-4" />
              <span>Data Protection</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
            <p className="text-xs text-slate-500">Last updated: September 2026</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <strong className="block font-semibold mb-1">
                Notice Regarding Sensitive Credentials:
              </strong>
              Do not upload screenshots or files containing raw passwords, cryptocurrency private keys, unmasked credit card numbers, or government-issued national identifiers.
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              1. Our Core Privacy Guarantee
            </h2>
            <p className="text-xs text-slate-600">
              Smart AI is designed on ephemeral, volatile data processing principles. We do not maintain a permanent database of your uploaded screenshots, converted PDFs, or processed images. Files uploaded for conversion or visual analysis are held in volatile system RAM only for the duration of the operational request, after which the buffers are recycled.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              2. Data We Process to Provide the Service
            </h2>
            <ul className="space-y-2 text-xs text-slate-600 list-disc pl-5">
              <li>
                <strong>Ephemeral File Buffers:</strong> Images and PDFs uploaded by users to execute requested conversions, compressions, or Gemini multimodal analyses.
              </li>
              <li>
                <strong>Scam Inspection Inputs:</strong> Text strings and URLs voluntarily submitted for risk indicator analysis.
              </li>
              <li>
                <strong>Usage Metrics:</strong> Anonymous client hashes or user account IDs used strictly to prevent denial-of-service and enforce daily rate limits.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              3. Third-Party AI Processing
            </h2>
            <p className="text-xs text-slate-600">
              Visual and linguistic inference requests are processed securely using Google Gemini enterprise APIs on our private server-side architecture. Your inputs are transmitted over TLS-encrypted tunnels. We do not sell your personal content, nor do we license user uploads to third-party advertising networks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              4. Data Retention & Deletion
            </h2>
            <p className="text-xs text-slate-600">
              Generated file artifacts are streamed directly back to your browser session. If you register an account, your email and authentication credentials are encrypted using secure cryptographic hashing algorithms. You may request deletion of your account and associated session history at any time.
            </p>
          </section>
        </div>
      ) : (
        /* TERMS OF SERVICE */
        <div className="space-y-8 bg-white p-8 rounded-2xl border border-slate-200 text-slate-700 text-sm leading-relaxed shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
              <FileText className="w-4 h-4" />
              <span>Legal Guidelines</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
            <p className="text-xs text-slate-500">Effective Date: September 2026</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              1. Acceptance of Terms
            </h2>
            <p className="text-xs text-slate-600">
              By accessing or using the Smart AI platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please discontinue using the service immediately.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              2. Acceptable Use Policy
            </h2>
            <p className="text-xs text-slate-600">
              You agree not to use Smart AI to:
            </p>
            <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-5">
              <li>Upload malicious code, executables, malware, or exploit scripts.</li>
              <li>Attempt to bypass or manipulate server-side daily usage limits or rate-limiting firewalls.</li>
              <li>Generate deceptive communications intended to defraud or impersonate others.</li>
              <li>Process content that violates applicable regional copyright laws or intellectual property rights.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              3. AI Advice & Scam Checking Disclaimer
            </h2>
            <p className="text-xs text-slate-600">
              The output of Smart AI tools—including Screenshot AI analysis, error diagnostic solutions, and Scam Checker risk scores—is provided for informational and educational assistance only. While we strive for high precision, AI models may occasionally misinterpret ambiguous visual context or novel social engineering tactics. Smart AI does not provide binding legal, financial, or cybersecurity guarantees. Always exercise independent caution before interacting with untrusted parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              4. Availability & Rate Limiting
            </h2>
            <p className="text-xs text-slate-600">
              We reserve the right to establish and enforce server-authoritative rate limits on all utility operations to protect system stability and ensure fair availability for all global users.
            </p>
          </section>
        </div>
      )}
    </div>
  );
};
