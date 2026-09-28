import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Globe,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Info,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Search,
} from "lucide-react";
import { ScamMessageResult, UrlSecurityResult } from "../types";
import { checkScamMessageApi, checkScamUrlApi } from "../lib/api";
import { SeoToolContent } from "../components/SeoToolContent";

interface ScamCheckerViewProps {
  initialTab?: "message" | "url";
  onQuotaUpdate?: () => void;
}

export const ScamCheckerView: React.FC<ScamCheckerViewProps> = ({
  initialTab = "message",
  onQuotaUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<"message" | "url">(initialTab);

  // Message Checker State
  const [messageText, setMessageText] = useState("");
  const [messageCategory, setMessageCategory] = useState("generic");
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageResult, setMessageResult] = useState<ScamMessageResult | null>(null);

  // URL Checker State
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlResult, setUrlResult] = useState<UrlSecurityResult | null>(null);

  // Handle Message Check
  const handleCheckMessage = async () => {
    if (!messageText.trim()) {
      setMessageError("Please enter or paste a message to inspect.");
      return;
    }

    setMessageLoading(true);
    setMessageError(null);

    try {
      const data = await checkScamMessageApi(messageText, messageCategory);
      setMessageResult(data);
      if (onQuotaUpdate) onQuotaUpdate();
    } catch (err: any) {
      setMessageError(err.message || "Could not analyze message at this time.");
    } finally {
      setMessageLoading(false);
    }
  };

  // Handle URL Check
  const handleCheckUrl = async () => {
    if (!urlInput.trim()) {
      setUrlError("Please enter a website URL to evaluate.");
      return;
    }

    setUrlLoading(true);
    setUrlError(null);

    try {
      const data = await checkScamUrlApi(urlInput);
      setUrlResult(data);
      if (onQuotaUpdate) onQuotaUpdate();
    } catch (err: any) {
      setUrlError(err.message || "Could not evaluate URL. Please check formatting.");
    } finally {
      setUrlLoading(false);
    }
  };

  // Preset sample messages
  const loadSampleMessage = (type: "bank" | "irs" | "normal") => {
    if (type === "bank") {
      setMessageText(
        "URGENT: Chase Alert! Your debit card has been suspended due to unrecognized activity. Click immediately to verify your identity and unlock: http://chase-security-verify.xyz/auth or your account will be permanently closed in 2 hours."
      );
      setMessageCategory("sms");
    } else if (type === "irs") {
      setMessageText(
        "FINAL NOTICE: Internal Revenue Service (IRS) has issued an arrest warrant against your SSN for outstanding tax debt. To avoid immediate law enforcement arrival at your home, pay penalty balance $1,450 via Apple Gift Cards or Target Prepaid card now."
      );
      setMessageCategory("email");
    } else {
      setMessageText(
        "Hi David, hope you're having a productive week! Just checking if you have 10 minutes tomorrow afternoon to discuss our project timeline. Let me know if 2pm works for you."
      );
      setMessageCategory("generic");
    }
    setMessageResult(null);
    setMessageError(null);
  };

  // Preset sample URLs
  const loadSampleUrl = (type: "phishing" | "shortener" | "legit") => {
    if (type === "phishing") {
      setUrlInput("http://paypal-security-account.update-login.net/confirm");
    } else if (type === "shortener") {
      setUrlInput("https://bit.ly/urgent-package-redelivery384");
    } else {
      setUrlInput("https://www.wikipedia.org");
    }
    setUrlResult(null);
    setUrlError(null);
  };

  const getRiskColor = (level: "LOW RISK" | "SUSPICIOUS" | "HIGH RISK") => {
    switch (level) {
      case "HIGH RISK":
        return {
          badge: "bg-rose-100 text-rose-800 border-rose-200",
          gauge: "bg-rose-600",
          cardBg: "bg-rose-50/50 border-rose-200",
        };
      case "SUSPICIOUS":
        return {
          badge: "bg-amber-100 text-amber-800 border-amber-200",
          gauge: "bg-amber-500",
          cardBg: "bg-amber-50/50 border-amber-200",
        };
      case "LOW RISK":
      default:
        return {
          badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
          gauge: "bg-emerald-600",
          cardBg: "bg-emerald-50/50 border-emerald-200",
        };
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8">
      {/* Title & Description */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 mb-2">
          <ShieldAlert className="w-4 h-4" />
          <span>Threat & Risk Detection</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Scam & Threat Checker
        </h1>
        <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl">
          Evaluate suspicious messages, emails, SMS, and website links for warning signs, psychological urgency traps, impersonation targets, and deceptive domain structures.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 max-w-md border border-slate-200">
        <button
          id="tab-scam-message"
          onClick={() => setActiveTab("message")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "message"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span>Suspicious Message</span>
        </button>
        <button
          id="tab-scam-url"
          onClick={() => setActiveTab("url")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "url"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Globe className="w-4 h-4 text-rose-600" />
          <span>Website URL Security</span>
        </button>
      </div>

      {/* TAB 1: MESSAGE CHECKER */}
      {activeTab === "message" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Paste Suspicious Message / Email Content
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Context:</span>
                <select
                  value={messageCategory}
                  onChange={(e) => setMessageCategory(e.target.value)}
                  className="text-xs px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-700"
                >
                  <option value="generic">Generic Message</option>
                  <option value="sms">SMS / Text Message</option>
                  <option value="email">Email</option>
                  <option value="social">WhatsApp / Telegram / Social DM</option>
                </select>
              </div>
            </div>

            <textarea
              id="scam-message-input"
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="e.g. 'URGENT: Your account has been suspended. Please confirm your credentials...'"
              className="w-full p-3.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />

            {/* Test samples for quick evaluation */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400 font-medium">Test Samples:</span>
              <button
                type="button"
                onClick={() => loadSampleMessage("bank")}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Bank Freeze SMS
              </button>
              <button
                type="button"
                onClick={() => loadSampleMessage("irs")}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                IRS Arrest / Gift Cards
              </button>
              <button
                type="button"
                onClick={() => loadSampleMessage("normal")}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Normal Meeting Request
              </button>
            </div>

            {messageError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{messageError}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                id="check-message-btn"
                onClick={handleCheckMessage}
                disabled={messageLoading}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-600 text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {messageLoading ? (
                  <>
                    <Search className="w-4 h-4 animate-spin" />
                    <span>Evaluating Scam Indicators...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Check for Scam Signals</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Display */}
          {messageResult && (
            <div
              id="message-result-card"
              className={`rounded-2xl border p-6 sm:p-8 space-y-6 animate-in fade-in ${
                getRiskColor(messageResult.riskLevel).cardBg
              }`}
            >
              {/* Risk Level Badge & Score Gauge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 gap-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                        getRiskColor(messageResult.riskLevel).badge
                      }`}
                    >
                      {messageResult.riskLevel}
                    </span>
                    {messageResult.impersonationTarget && (
                      <span className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold">
                        Target: {messageResult.impersonationTarget}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {messageResult.riskLabel}
                  </h3>
                </div>

                {/* Score bar */}
                <div className="w-full sm:w-48 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-500">Risk Score</span>
                    <span className="text-slate-900">{messageResult.riskScore} / 100</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getRiskColor(messageResult.riskLevel).gauge}`}
                      style={{ width: `${messageResult.riskScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Analysis Summary
                </h4>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {messageResult.summary}
                </p>
              </div>

              {/* Psychological Triggers */}
              {messageResult.psychologicalTriggers && messageResult.psychologicalTriggers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Detected Social Engineering Tactics
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {messageResult.psychologicalTriggers.map((t, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-rose-100/70 text-rose-900 text-xs font-semibold border border-rose-200"
                      >
                        ⚠️ {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Signs */}
              {messageResult.warningSigns && messageResult.warningSigns.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Warning Signs Identified
                  </h4>
                  <ul className="space-y-1.5">
                    {messageResult.warningSigns.map((w, i) => (
                      <li
                        key={i}
                        className="text-xs text-slate-800 flex items-start gap-2 bg-white/70 p-2.5 rounded-lg border border-slate-200"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Safety Recommendations */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Practical Safety Steps
                </h4>
                <ul className="space-y-1.5">
                  {messageResult.safetyRecommendations.map((r, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-800 flex items-start gap-2 bg-white/70 p-2.5 rounded-lg border border-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Neutrality Statement */}
              <div className="text-[11px] text-slate-500 bg-white/50 p-3 rounded-lg border border-slate-200">
                <p>
                  <strong>Disclaimer:</strong> {messageResult.neutralityStatement}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: URL SECURITY CHECKER */}
      {activeTab === "url" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Enter Suspicious Website Address (URL)
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="scam-url-input"
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="e.g. https://login-account-update.net/auth"
                className="flex-1 p-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent font-mono"
              />
              <button
                id="check-url-btn"
                onClick={handleCheckUrl}
                disabled={urlLoading}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-rose-600 text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {urlLoading ? (
                  <>
                    <Search className="w-4 h-4 animate-spin" />
                    <span>Scanning URL...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Analyze Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Test samples for quick evaluation */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400 font-medium">Test Samples:</span>
              <button
                type="button"
                onClick={() => loadSampleUrl("phishing")}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                PayPal Phishing Look-alike
              </button>
              <button
                type="button"
                onClick={() => loadSampleUrl("shortener")}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Masked Shortener Link
              </button>
              <button
                type="button"
                onClick={() => loadSampleUrl("legit")}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Legitimate Domain (Wikipedia)
              </button>
            </div>

            {urlError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{urlError}</span>
              </div>
            )}
          </div>

          {/* URL Results Card */}
          {urlResult && (
            <div
              id="url-result-card"
              className={`rounded-2xl border p-6 sm:p-8 space-y-6 animate-in fade-in ${
                getRiskColor(urlResult.riskLevel).cardBg
              }`}
            >
              {/* Risk Level & Gauge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 gap-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                        getRiskColor(urlResult.riskLevel).badge
                      }`}
                    >
                      {urlResult.riskLevel}
                    </span>
                    <span className="text-xs font-mono text-slate-600 font-medium">
                      Domain: {urlResult.domain}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {urlResult.riskLabel}
                  </h3>
                </div>

                {/* Score bar */}
                <div className="w-full sm:w-48 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-500">Risk Score</span>
                    <span className="text-slate-900">{urlResult.riskScore} / 100</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getRiskColor(urlResult.riskLevel).gauge}`}
                      style={{ width: `${urlResult.riskScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  URL Security Assessment
                </h4>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {urlResult.summary}
                </p>
              </div>

              {/* Technical Signals Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Technical Security Signals
                </h4>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {urlResult.technicalSignals.map((sig) => (
                    <div
                      key={sig.id}
                      className="p-3 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{sig.name}</span>
                        <span className="text-slate-500">{sig.description}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          sig.status === "pass"
                            ? "bg-emerald-100 text-emerald-800"
                            : sig.status === "warn"
                            ? "bg-amber-100 text-amber-800"
                            : sig.status === "fail"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {sig.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning Signs */}
              {urlResult.warningSigns && urlResult.warningSigns.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Specific Warning Signs
                  </h4>
                  <ul className="space-y-1.5">
                    {urlResult.warningSigns.map((w, i) => (
                      <li
                        key={i}
                        className="text-xs text-slate-800 flex items-start gap-2 bg-white/70 p-2.5 rounded-lg border border-slate-200"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Safety Recommendations */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Safety Recommendations
                </h4>
                <ul className="space-y-1.5">
                  {urlResult.safetyRecommendations.map((r, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-800 flex items-start gap-2 bg-white/70 p-2.5 rounded-lg border border-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Threat DB Status & Neutrality Statement */}
              <div className="text-[11px] text-slate-500 bg-white/50 p-3 rounded-lg border border-slate-200 space-y-1">
                <p>
                  <strong>Intelligence Note:</strong> {urlResult.threatDatabaseStatus}
                </p>
                <p>
                  <strong>Neutrality Policy:</strong> {urlResult.neutralityStatement}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Structured SEO Technical Specifications, Instructions & Real FAQs */}
      <SeoToolContent pagePath="/scam-checker" />
    </div>
  );
};
