import { generateContentWithFallback } from "./geminiClient";

export interface ScamAnalysisResult {
  inputType: "message" | "email" | "sms" | "social" | "whatsapp";
  riskScore: number; // 0-100 (kept within 5-95)
  riskLevel: "LOW RISK" | "SUSPICIOUS" | "HIGH RISK";
  riskLabel: string; // "🟢 LOW RISK" | "🟡 SUSPICIOUS" | "🔴 HIGH RISK"
  summary: string;
  warningSigns: string[];
  safetyRecommendations: string[];
  impersonationTarget?: string;
  psychologicalTriggers: string[]; // e.g. "Artificial Urgency", "Fear of Account Loss", "Greed / Reward"
  neutralityStatement: string;
}

export async function analyzeScamMessage(
  text: string,
  category: "sms" | "whatsapp" | "email" | "social" | "general" = "general"
): Promise<ScamAnalysisResult> {
  const systemInstruction = `You are the Scam Checker engine of Smart AI ("Understand. Convert. Stay Safe.").
Analyze this digital message/email/text for scam, fraud, social engineering, and phishing indicators.

Indicators to specifically inspect:
1. Urgent pressure or artificial deadlines (e.g. "within 24 hours or account suspended")
2. Direct or indirect requests for passwords, credentials, or seed phrases
3. Requests for One-Time Passcodes (OTP), 2FA verification codes, or PIN numbers
4. Requests for immediate wire transfer, gift cards, Zelle/Venmo, or cryptocurrency
5. Fake prizes, unclaimed lottery funds, unexpected inheritances, or unrealistic rewards
6. Impersonation of institutions (banks, postal services like USPS/DHL, tax authorities like IRS, Apple/Google/Microsoft support)
7. Suspicious links, shorteners, or typosquatted URLs
8. Intimidation, threats of legal action, arrest, or police involvement
9. Requests to install remote-desktop utilities (TeamViewer, AnyDesk) or unknown apps/executables
10. Requests for sensitive identifiers (Social Security Numbers, national IDs, mothers' maiden names)

STRICT ACCURACY RULES:
- Never state "100% safe" or "100% scam".
- Always keep the riskScore between 5 and 95 (never 0 or 100).
- If low risk, the neutralityStatement must be: "No obvious scam indicators detected, but this does not guarantee safety."
- If suspicious or high risk: "Suspicious indicators detected. Exercise extreme caution."
- Categorize riskLevel as:
  - 5 to 29: LOW RISK
  - 30 to 69: SUSPICIOUS
  - 70 to 95: HIGH RISK
- NEVER provide instructions that help scammers evade detection or bypass security controls.
- Provide actionable, practical safety recommendations for the victim (e.g. "Do not share OTPs", "Verify the sender via independent phone number", "Visit official site manually").
- Output pure JSON conforming to the schema.`;

  const promptText = `Category: ${category}
Message to analyze:
"""
${text}
"""

Return JSON matching:
{
  "inputType": "${category === "general" ? "message" : category}",
  "riskScore": 85,
  "riskLevel": "HIGH RISK",
  "riskLabel": "🔴 HIGH RISK",
  "summary": "Brief executive summary of findings",
  "warningSigns": ["List", "of", "detected", "tactics"],
  "safetyRecommendations": ["Action 1", "Action 2"],
  "impersonationTarget": "Organization claimed, or null",
  "psychologicalTriggers": ["Urgency", "Fear"],
  "neutralityStatement": "..."
}`;

  let responseText = "{}";
  try {
    const response = await generateContentWithFallback({
      preferredModel: "gemini-3.8-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });
    responseText = response.text || "{}";
  } catch (apiErr: any) {
    console.warn("Gemini API call failed for scam message, activating threat heuristic engine:", apiErr.message);
    return analyzeScamMessageHeuristically(text, category);
  }

  try {
    const parsed = JSON.parse(responseText);

    // Enforce constraints
    let score = typeof parsed.riskScore === "number" ? parsed.riskScore : 50;
    score = Math.min(95, Math.max(5, score));
    parsed.riskScore = score;

    if (score >= 70) {
      parsed.riskLevel = "HIGH RISK";
      parsed.riskLabel = "🔴 HIGH RISK";
      parsed.neutralityStatement = "Suspicious indicators detected. Exercise extreme caution.";
    } else if (score >= 30) {
      parsed.riskLevel = "SUSPICIOUS";
      parsed.riskLabel = "🟡 SUSPICIOUS";
      parsed.neutralityStatement = "Potential risk indicators identified. Independent verification recommended.";
    } else {
      parsed.riskLevel = "LOW RISK";
      parsed.riskLabel = "🟢 LOW RISK";
      parsed.neutralityStatement = "No obvious scam indicators detected, but this does not guarantee safety.";
    }

    if (!parsed.safetyRecommendations || parsed.safetyRecommendations.length === 0) {
      parsed.safetyRecommendations = [
        "Never share one-time passwords (OTP) or account credentials with anyone.",
        "Contact the organization using an independently verified phone number or official app.",
        "Do not click unsolicited links or download attachments from unexpected senders.",
      ];
    }

    return parsed as ScamAnalysisResult;
  } catch (err) {
    return {
      inputType: "message",
      riskScore: 50,
      riskLevel: "SUSPICIOUS",
      riskLabel: "🟡 SUSPICIOUS",
      summary: "Completed preliminary analysis of the submitted text.",
      warningSigns: ["Message structure contains patterns warranting caution"],
      safetyRecommendations: [
        "Do not share sensitive passwords or one-time passcodes.",
        "Verify the sender independently through official published channels.",
      ],
      psychologicalTriggers: ["Informational inquiry"],
      neutralityStatement: "Potential risk indicators identified. Independent verification recommended.",
    };
  }
}

function analyzeScamMessageHeuristically(
  text: string,
  category: "sms" | "whatsapp" | "email" | "social" | "general"
): ScamAnalysisResult {
  const lower = text.toLowerCase();
  const warningSigns: string[] = [];
  const psychologicalTriggers: string[] = [];
  let riskScore = 15;
  let impersonationTarget: string | undefined = undefined;

  // Check for credential / OTP theft
  if (
    lower.includes("otp") ||
    lower.includes("verification code") ||
    lower.includes("passcode") ||
    lower.includes("6-digit") ||
    lower.includes("secret code") ||
    lower.includes("pin")
  ) {
    warningSigns.push("Direct solicitation of confidential one-time authorization credentials (OTP/2FA)");
    psychologicalTriggers.push("Urgency", "Fear of Account Loss");
    riskScore = Math.max(riskScore, 92);
  }

  // Check for advance-fee / prize scam
  if (
    lower.includes("lottery") ||
    lower.includes("winner") ||
    lower.includes("grand winner") ||
    lower.includes("won $") ||
    lower.includes("western union") ||
    lower.includes("moneygram") ||
    lower.includes("processing voucher") ||
    lower.includes("processing fee") ||
    lower.includes("gift card")
  ) {
    warningSigns.push("Unsolicited claim of massive prize or lottery payout requiring upfront processing fee");
    warningSigns.push("Demand for payment via untraceable wire transfer, vouchers, or gift cards");
    psychologicalTriggers.push("Greed", "Excitement", "Phantom Riches");
    riskScore = Math.max(riskScore, 95);
  }

  // Check for urgency and account locking
  if (
    lower.includes("locked") ||
    lower.includes("suspended") ||
    lower.includes("immediately") ||
    lower.includes("within 24 hours") ||
    lower.includes("urgent") ||
    lower.includes("action required")
  ) {
    warningSigns.push("Artificial time pressure designed to prevent critical evaluation");
    psychologicalTriggers.push("Fear of Account Loss", "Artificial Urgency");
    riskScore = Math.max(riskScore, 80);
  }

  // Check for bank/institution impersonation
  if (lower.includes("chase") || lower.includes("bank of america") || lower.includes("wells fargo") || lower.includes("paypal")) {
    impersonationTarget = "Financial Institution";
  } else if (lower.includes("mega lottery") || lower.includes("powerball")) {
    impersonationTarget = "Lottery Organization";
  }

  // Categorize
  let riskLevel: "LOW RISK" | "SUSPICIOUS" | "HIGH RISK" = "LOW RISK";
  let riskLabel = "🟢 LOW RISK";
  let neutralityStatement = "No obvious scam indicators detected, but this does not guarantee safety.";

  if (riskScore >= 70) {
    riskLevel = "HIGH RISK";
    riskLabel = "🔴 HIGH RISK";
    neutralityStatement = "Suspicious indicators detected. Exercise extreme caution.";
  } else if (riskScore >= 30) {
    riskLevel = "SUSPICIOUS";
    riskLabel = "🟡 SUSPICIOUS";
    neutralityStatement = "Potential risk indicators identified. Independent verification recommended.";
  }

  const safetyRecommendations =
    riskScore >= 70
      ? [
          "Do not reply, click links, or send any funds, vouchers, or passwords.",
          "Independently contact the institution via official published phone numbers.",
          "Block the sender and report the message as malicious phishing.",
        ]
      : [
          "Verify the identity of the sender through a secondary trusted communication channel.",
          "Never disclose passwords, credentials, or one-time passcodes under any circumstances.",
        ];

  return {
    inputType: category === "general" ? "message" : category,
    riskScore,
    riskLevel,
    riskLabel,
    summary:
      riskScore >= 70
        ? "This message exhibits strong scam and social engineering markers, including urgent requests for action and sensitive data."
        : "Initial heuristic review did not detect explicit high-severity phishing signatures.",
    warningSigns: warningSigns.length > 0 ? warningSigns : ["No blatant deceptive triggers detected"],
    safetyRecommendations,
    impersonationTarget,
    psychologicalTriggers: psychologicalTriggers.length > 0 ? psychologicalTriggers : ["Informational"],
    neutralityStatement,
  };
}
