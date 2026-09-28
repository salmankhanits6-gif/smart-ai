import { PagesFunction, jsonResponse, handleOptions } from "../../types";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return handleOptions(request);
};

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as any;
    const { text, category = "general" } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return jsonResponse({ error: "Please provide a message or text to inspect." }, 400, request);
    }
    if (text.trim().length > 10000) {
      return jsonResponse({ error: "Message exceeds maximum length (10,000 characters)." }, 400, request);
    }

    const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;

    const systemInstruction = `You are the Scam Checker engine of Smart AI ("Understand. Convert. Stay Safe.").
Analyze this digital message/email/text for scam, fraud, social engineering, and phishing indicators.
STRICT ACCURACY RULES:
- Never state "100% safe" or "100% scam".
- Always keep the riskScore between 5 and 95 (never 0 or 100).
- If low risk, neutralityStatement: "No obvious scam indicators detected, but this does not guarantee safety."
- If suspicious or high risk: "Suspicious indicators detected. Exercise extreme caution."
- Categorize riskLevel as:
  - 5 to 29: LOW RISK (🟢 LOW RISK)
  - 30 to 69: SUSPICIOUS (🟡 SUSPICIOUS)
  - 70 to 95: HIGH RISK (🔴 HIGH RISK)
- Provide actionable, practical safety recommendations for the victim.
- Output pure JSON conforming to schema:
{
  "inputType": "${category === "general" ? "message" : category}",
  "riskScore": 85,
  "riskLevel": "HIGH RISK",
  "riskLabel": "🔴 HIGH RISK",
  "summary": "Brief executive summary",
  "warningSigns": ["Tactic 1", "Tactic 2"],
  "safetyRecommendations": ["Action 1", "Action 2"],
  "impersonationTarget": "Claimed entity or null",
  "psychologicalTriggers": ["Urgency", "Fear"],
  "neutralityStatement": "..."
}`;

    let result: any = null;

    if (apiKey) {
      const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
      for (const model of modelsToTry) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `Category: ${category}\nMessage to analyze:\n"""\n${text.trim()}\n"""\nReturn JSON conforming to schema:`,
                      },
                    ],
                  },
                ],
                systemInstruction: {
                  parts: [{ text: systemInstruction }],
                },
                generationConfig: {
                  temperature: 0.1,
                  responseMimeType: "application/json",
                },
              }),
            }
          );

          if (geminiRes.ok) {
            const data = (await geminiRes.json()) as any;
            const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textOutput) {
              result = JSON.parse(textOutput);
              break;
            }
          }
        } catch {
          // fallback to next model
        }
      }
    }

    if (!result) {
      // Robust Threat Heuristic Engine Fallback
      result = runHeuristicScamCheck(text.trim(), category);
    }

    // Normalize score and labels
    let score = typeof result.riskScore === "number" ? result.riskScore : 50;
    score = Math.min(95, Math.max(5, score));
    result.riskScore = score;

    if (score >= 70) {
      result.riskLevel = "HIGH RISK";
      result.riskLabel = "🔴 HIGH RISK";
      result.neutralityStatement = "Suspicious indicators detected. Exercise extreme caution.";
    } else if (score >= 30) {
      result.riskLevel = "SUSPICIOUS";
      result.riskLabel = "🟡 SUSPICIOUS";
      result.neutralityStatement = "Potential risk indicators identified. Independent verification recommended.";
    } else {
      result.riskLevel = "LOW RISK";
      result.riskLabel = "🟢 LOW RISK";
      result.neutralityStatement = "No obvious scam indicators detected, but this does not guarantee safety.";
    }

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
    const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
    const sanitizedDetails = apiKey && err ? (err.message || "").replaceAll(apiKey, "[REDACTED]") : (err?.message || "");
    return jsonResponse(
      {
        error: "Smart AI could not complete this request right now. Please try again.",
        details: sanitizedDetails,
      },
      500,
      request
    );
  }
};

function runHeuristicScamCheck(text: string, category: string): any {
  const lower = text.toLowerCase();
  const warningSigns: string[] = [];
  const psychologicalTriggers: string[] = [];
  let score = 20;

  if (/urgent|immediately|within 24 hours|account suspended|locked|act now|time sensitive/i.test(lower)) {
    score += 25;
    warningSigns.push("Artificial time pressure designed to prevent deliberate verification");
    psychologicalTriggers.push("Urgency & Panic");
  }
  if (/password|pin|otp|passcode|one-time code|social security|ssn|verification code/i.test(lower)) {
    score += 35;
    warningSigns.push("Explicit solicitation of credentials, security codes, or confidential numbers");
    psychologicalTriggers.push("Credential Harvesting");
  }
  if (/wire transfer|gift card|crypto|bitcoin|zelle|venmo|western union|cashapp/i.test(lower)) {
    score += 30;
    warningSigns.push("Request for irreversible or non-traceable payment methods");
    psychologicalTriggers.push("Financial Extortion");
  }
  if (/congratulations|lottery|winner|inherited|unclaimed funds|\$[0-9,]{4,}/i.test(lower)) {
    score += 25;
    warningSigns.push("Unrealistic financial payout or lottery winnings from unknown sources");
    psychologicalTriggers.push("Greed & Reward Exploitation");
  }

  score = Math.min(95, Math.max(5, score));

  return {
    inputType: category === "general" ? "message" : category,
    riskScore: score,
    riskLevel: score >= 70 ? "HIGH RISK" : score >= 30 ? "SUSPICIOUS" : "LOW RISK",
    riskLabel: score >= 70 ? "🔴 HIGH RISK" : score >= 30 ? "🟡 SUSPICIOUS" : "🟢 LOW RISK",
    summary:
      score >= 70
        ? "High-risk indicators identified: message matches common phishing or extortion patterns."
        : score >= 30
        ? "Potential risk elements detected. Exercise caution before replying or clicking links."
        : "No immediate high-risk phrases detected in the submitted message.",
    warningSigns: warningSigns.length > 0 ? warningSigns : ["Standard digital correspondence format"],
    safetyRecommendations: [
      "Never share one-time passcodes (OTP) or authentication codes.",
      "Verify the sender's identity through official published channels.",
      "Do not click unsolicited links or download unexpected attachments.",
    ],
    psychologicalTriggers: psychologicalTriggers.length > 0 ? psychologicalTriggers : ["Standard Inquiry"],
    neutralityStatement: "Potential risk indicators evaluated. Independent verification recommended.",
  };
}
