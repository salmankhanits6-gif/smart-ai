import { PagesFunction, jsonResponse, handleOptions } from "../../types";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return handleOptions(request);
};

export const onRequestPost: PagesFunction = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as any;
    const { url } = body;

    if (!url || typeof url !== "string" || url.trim().length === 0) {
      return jsonResponse({ error: "Please provide a website URL to evaluate." }, 400, request);
    }

    const trimmed = url.trim();
    let parsed: URL;
    try {
      parsed = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`);
    } catch {
      return jsonResponse({ error: "Invalid web address format." }, 400, request);
    }

    const domain = parsed.hostname.toLowerCase();
    const tld = domain.split(".").pop() || "";
    const highRiskTlds = new Set(["zip", "mov", "top", "xyz", "tk", "ml", "cf", "gq", "buzz", "work", "click", "link", "live", "download", "racing"]);
    const popularBrands = ["paypal", "apple", "google", "microsoft", "amazon", "netflix", "facebook", "instagram", "whatsapp", "wellsfargo", "chase", "bankofamerica", "coinbase", "binance", "dhl", "usps", "fedex"];

    const warningSigns: string[] = [];
    const technicalSignals: any[] = [];
    let riskScore = 15;

    // Check TLD
    if (highRiskTlds.has(tld)) {
      riskScore += 30;
      warningSigns.push(`High-abuse top-level domain (.${tld}) frequently used in short-lived phishing campaigns`);
      technicalSignals.push({ id: "tld", name: "Domain Extension", status: "warn", description: `Extension .${tld} has elevated abuse rates` });
    } else {
      technicalSignals.push({ id: "tld", name: "Domain Extension", status: "pass", description: `Standard commercial extension (.${tld})` });
    }

    // Check IP host
    if (/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(domain)) {
      riskScore += 45;
      warningSigns.push("Direct IP address used instead of a registered domain name");
      technicalSignals.push({ id: "ip_host", name: "Direct IP Host", status: "fail", description: "Direct numerical IP hosts are strongly correlated with malware command-and-control" });
    }

    // Check typosquatting/brand impersonation
    let impersonatedBrand: string | null = null;
    for (const brand of popularBrands) {
      if (domain.includes(brand) && !domain.endsWith(`.${brand}.com`) && domain !== `${brand}.com`) {
        impersonatedBrand = brand;
        riskScore += 40;
        warningSigns.push(`Possible impersonation of brand "${brand}" in hostname (${domain})`);
        technicalSignals.push({ id: "brand_mimic", name: "Brand Match", status: "fail", description: `Domain contains "${brand}" but is not the official property` });
        break;
      }
    }

    // Check HTTPS
    if (parsed.protocol !== "https:") {
      riskScore += 20;
      warningSigns.push("Insecure HTTP protocol (unencrypted connection)");
      technicalSignals.push({ id: "protocol", name: "Transport Encryption", status: "warn", description: "Unencrypted plaintext transmission" });
    } else {
      technicalSignals.push({ id: "protocol", name: "Transport Encryption", status: "pass", description: "Valid HTTPS scheme" });
    }

    // Redirect inspection
    const redirectChain: string[] = [parsed.href];
    try {
      const probeRes = await fetch(parsed.href, {
        method: "HEAD",
        redirect: "follow",
        headers: { "User-Agent": "SmartAI-SecurityBot/1.0" },
      });
      if (probeRes.url && probeRes.url !== parsed.href) {
        redirectChain.push(probeRes.url);
      }
      technicalSignals.push({ id: "connectivity", name: "Host Reachability", status: "pass", description: `Server responded with HTTP ${probeRes.status}` });
    } catch {
      technicalSignals.push({ id: "connectivity", name: "Host Reachability", status: "info", description: "Direct network probe skipped or timed out" });
    }

    riskScore = Math.min(95, Math.max(5, riskScore));

    const result = {
      url: trimmed,
      normalizedUrl: parsed.href,
      domain,
      riskScore,
      riskLevel: riskScore >= 70 ? "HIGH RISK" : riskScore >= 30 ? "SUSPICIOUS" : "LOW RISK",
      riskLabel: riskScore >= 70 ? "🔴 HIGH RISK" : riskScore >= 30 ? "🟡 SUSPICIOUS" : "🟢 LOW RISK",
      summary:
        riskScore >= 70
          ? `High-risk indicators detected for ${domain}. Exercise extreme caution.`
          : riskScore >= 30
          ? `Suspicious patterns observed on ${domain}. Verify before entering credentials.`
          : `No immediate threat patterns detected for ${domain}.`,
      warningSigns: warningSigns.length > 0 ? warningSigns : ["Clean domain syntax and standard top-level extension"],
      safetyRecommendations: [
        "Never enter account passwords or financial details on unverified URLs.",
        "Check that the address bar matches the company's verified domain exactly.",
      ],
      technicalSignals,
      redirectChain,
      threatDatabaseStatus: "Verified against heuristic risk index",
      neutralityStatement: "Smart AI assesses technical indicators; always independently verify unfamiliar links.",
    };

    return jsonResponse(
      {
        success: true,
        data: result,
        usage: {
          remaining: 10,
          total: 10,
        },
      },
      200,
      request
    );
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Failed to inspect URL." }, 400, request);
  }
};
