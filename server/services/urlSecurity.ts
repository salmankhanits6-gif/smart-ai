import { URL } from "url";
import https from "https";
import http from "http";

export interface UrlSignalCheck {
  id: string;
  name: string;
  status: "pass" | "warn" | "fail" | "info";
  description: string;
}

export interface UrlSecurityResult {
  url: string;
  normalizedUrl: string;
  domain: string;
  riskScore: number; // 0 - 100
  riskLevel: "LOW RISK" | "SUSPICIOUS" | "HIGH RISK";
  riskLabel: string; // "🟢 LOW RISK" | "🟡 SUSPICIOUS" | "🔴 HIGH RISK"
  summary: string;
  warningSigns: string[];
  safetyRecommendations: string[];
  technicalSignals: UrlSignalCheck[];
  redirectChain?: string[];
  threatDatabaseStatus: string;
  neutralityStatement: string;
}

const HIGH_RISK_TLDS = new Set([
  "zip",
  "mov",
  "top",
  "xyz",
  "tk",
  "ml",
  "cf",
  "gq",
  "buzz",
  "work",
  "rest",
  "fit",
  "surf",
  "click",
  "link",
  "live",
  "country",
  "stream",
  "download",
  "racing",
]);

const POPULAR_TARGET_BRANDS = [
  "paypal",
  "apple",
  "google",
  "microsoft",
  "amazon",
  "netflix",
  "facebook",
  "instagram",
  "whatsapp",
  "chase",
  "wellsfargo",
  "bankofamerica",
  "citibank",
  "binance",
  "coinbase",
  "usps",
  "fedex",
  "dhl",
  "ups",
  "irs",
  "gov",
];

// Helper to check for lookalike brands in domain
function detectBrandImpersonation(domain: string): { matches: string[]; isSuspicious: boolean } {
  const parts = domain.toLowerCase().split(".");
  const sld = parts.length >= 2 ? parts[parts.length - 2] : domain;
  const matches: string[] = [];

  for (const brand of POPULAR_TARGET_BRANDS) {
    // If brand is in the domain name but it's not the official brand domain
    if (domain.includes(brand)) {
      // Check if it's the exact legitimate domain (e.g. paypal.com, google.com)
      const isOfficial =
        domain === `${brand}.com` ||
        domain.endsWith(`.${brand}.com`) ||
        domain === `${brand}.org` ||
        domain.endsWith(`.${brand}.org`);
      if (!isOfficial) {
        matches.push(brand);
      }
    }
  }

  return {
    matches,
    isSuspicious: matches.length > 0,
  };
}

export async function analyzeUrlSecurity(rawUrl: string): Promise<UrlSecurityResult> {
  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch (e) {
    throw new Error("Invalid URL format. Please enter a valid web address.");
  }

  const hostname = parsed.hostname.toLowerCase();
  const protocol = parsed.protocol.toLowerCase();
  const warningSigns: string[] = [];
  const safetyRecommendations: string[] = [];
  const signals: UrlSignalCheck[] = [];
  let riskScore = 10; // Baseline caution

  // 1. Protocol evaluation
  if (protocol === "http:") {
    riskScore += 25;
    warningSigns.push("Connection is unencrypted (Plain HTTP). Any data entered can be intercepted.");
    signals.push({
      id: "protocol",
      name: "Transport Encryption",
      status: "warn",
      description: "Uses unencrypted HTTP instead of modern secure HTTPS.",
    });
    safetyRecommendations.push("Do not enter passwords, cards, or sensitive data on unencrypted HTTP pages.");
  } else {
    signals.push({
      id: "protocol",
      name: "Transport Encryption",
      status: "pass",
      description: "Uses HTTPS encryption. (Important: HTTPS encrypts traffic, but scammers can also obtain free HTTPS certificates).",
    });
  }

  // 2. IP address as host
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  if (isIp) {
    riskScore += 45;
    warningSigns.push(`Hostname is a raw IP address (${hostname}) rather than a registered domain name.`);
    signals.push({
      id: "ip_host",
      name: "IP-based Hostname",
      status: "fail",
      description: "Direct IP addresses are commonly used to host phishing kits or bypass domain filtering.",
    });
    safetyRecommendations.push("Legitimate businesses and services almost never ask customers to log into raw IP addresses.");
  } else {
    signals.push({
      id: "ip_host",
      name: "Registered Domain Format",
      status: "pass",
      description: "Uses standard domain name syntax.",
    });
  }

  // 3. Userinfo in URL (@ symbol trick)
  if (parsed.username || parsed.password) {
    riskScore += 50;
    warningSigns.push("URL contains embedded user authentication credentials (@ symbol structure), often used to disguise fake destinations.");
    signals.push({
      id: "userinfo",
      name: "Credential Masking Check",
      status: "fail",
      description: "Presence of username/password delimiters in URL authority.",
    });
  }

  // 4. Punycode / IDN Homograph attack check
  if (hostname.includes("xn--")) {
    riskScore += 40;
    warningSigns.push(`Contains internationalized domain / Punycode characters (${hostname}). Often used to impersonate characters (e.g. Cyrillic 'а' replacing Latin 'a').`);
    signals.push({
      id: "punycode",
      name: "Punycode / Homograph Check",
      status: "warn",
      description: "Contains IDN punycode prefixes.",
    });
    safetyRecommendations.push("Examine the address bar carefully to ensure letters are not spoofed visual lookalikes.");
  }

  // 5. TLD Risk Evaluation
  const domainParts = hostname.split(".");
  const tld = domainParts.length > 1 ? domainParts[domainParts.length - 1] : "";
  if (HIGH_RISK_TLDS.has(tld)) {
    riskScore += 25;
    warningSigns.push(`Uses a top-level domain (.${tld}) frequently leveraged by low-cost automated phishing campaigns.`);
    signals.push({
      id: "tld_reputation",
      name: "Top-Level Domain Characteristics",
      status: "warn",
      description: `.${tld} is a high-frequency target extension in abusive registrations.`,
    });
  } else {
    signals.push({
      id: "tld_reputation",
      name: "Top-Level Domain",
      status: "info",
      description: `Domain extension is .${tld}.`,
    });
  }

  // 6. Subdomain Depth / Deceptive Chaining
  // e.g. login.chase.com.security-verify.net
  if (domainParts.length > 3) {
    riskScore += 20;
    warningSigns.push(`Excessive subdomain nesting (${domainParts.length} levels). Fraudulent links frequently nest brand names into subdomains of an unrelated primary domain.`);
    signals.push({
      id: "subdomain_depth",
      name: "Subdomain Nesting",
      status: "warn",
      description: `${domainParts.length} subdomain components detected.`,
    });
  }

  // 7. Brand Impersonation Check
  const brandCheck = detectBrandImpersonation(hostname);
  if (brandCheck.isSuspicious) {
    riskScore += 40;
    const brands = brandCheck.matches.join(", ");
    warningSigns.push(`Suspected brand impersonation detected: The domain includes references to "${brands}", but does not appear to be their official root domain.`);
    signals.push({
      id: "brand_lookalike",
      name: "Brand Look-alike Detection",
      status: "fail",
      description: `Contains trademark keywords (${brands}) hosted under non-official domain registry.`,
    });
    safetyRecommendations.push(`Never sign in using this link. Navigate manually to the verified official portal for ${brands}.`);
  }

  // 8. Path & Query String Examination
  const fullPath = parsed.pathname + parsed.search;
  const suspiciousKeywords = ["login", "signin", "verify", "secure", "update", "bank", "account", "wallet", "recovery", "suspended", "confirm"];
  let matchedKeywords: string[] = [];
  for (const kw of suspiciousKeywords) {
    if (fullPath.toLowerCase().includes(kw)) {
      matchedKeywords.push(kw);
    }
  }
  if (matchedKeywords.length >= 2 && brandCheck.isSuspicious) {
    riskScore += 15;
    warningSigns.push(`Path and query parameters explicitly target sensitive user workflows (${matchedKeywords.join(", ")}).`);
  }

  // Cap risk score between 5 and 95 (as required: never 0 or 100)
  riskScore = Math.min(95, Math.max(5, riskScore));

  let riskLevel: "LOW RISK" | "SUSPICIOUS" | "HIGH RISK";
  let riskLabel: string;
  if (riskScore >= 70) {
    riskLevel = "HIGH RISK";
    riskLabel = "🔴 HIGH RISK";
  } else if (riskScore >= 35) {
    riskLevel = "SUSPICIOUS";
    riskLabel = "🟡 SUSPICIOUS";
  } else {
    riskLevel = "LOW RISK";
    riskLabel = "🟢 LOW RISK";
  }

  if (safetyRecommendations.length === 0) {
    safetyRecommendations.push("Always verify the sender before opening unfamiliar links.");
    safetyRecommendations.push("Verify that the exact domain name matches your intended recipient or provider.");
    safetyRecommendations.push("Never submit one-time passwords (OTPs) or two-factor codes onto unverified websites.");
  }

  const neutralityStatement =
    riskLevel === "LOW RISK"
      ? "No obvious scam indicators detected, but this does not guarantee safety."
      : "Suspicious indicators detected based on technical domain, protocol, and structure analysis.";

  return {
    url: targetUrl,
    normalizedUrl: parsed.toString(),
    domain: hostname,
    riskScore,
    riskLevel,
    riskLabel,
    summary:
      riskLevel === "HIGH RISK"
        ? `High-risk indicators identified for ${hostname}. Several technical signals point towards deceptive or insecure domain configurations.`
        : riskLevel === "SUSPICIOUS"
        ? `Elevated caution advised for ${hostname}. Certain characteristics (subdomain nesting, TLD profile, or encryption status) warrant independent verification.`
        : `Basic technical checks did not reveal high-risk anomalies on ${hostname}. Always exercise standard digital caution.`,
    warningSigns,
    safetyRecommendations,
    technicalSignals: signals,
    threatDatabaseStatus: "Basic analysis only — no live threat-intelligence database was available.",
    neutralityStatement,
  };
}
