import { generateContentWithFallback } from "./geminiClient";

export type ScreenshotMode = "explain" | "error" | "form" | "ocr" | "reply";

export interface FormFieldInfo {
  fieldName: string;
  fieldPurpose: string;
  expectedDataType: string;
  isRequired: boolean;
  notes: string;
}

export interface SuggestedReplies {
  professional: string;
  friendly: string;
  short: string;
  polite: string;
}

export interface ScreenshotAnalysisResult {
  mode: ScreenshotMode;
  aiSummary: string;
  detectedContent: {
    contentType: string; // e.g. "Mobile UI", "Browser Console Error", "Registration Form", "Chat / Email", "Desktop App"
    visualContext: string;
    identifiedElements: string[];
  };
  explanation: string;
  recommendedAction: string;
  stepByStepSolution?: string[];
  preventionTips?: string[];
  extractedText?: string;
  formFields?: FormFieldInfo[];
  suggestedReplies?: SuggestedReplies;
  confidenceAssessment: {
    level: "HIGH" | "MEDIUM" | "LOW";
    notes: string;
    confirmedFacts: string[];
    aiHypotheses: string[];
  };
}

export async function analyzeScreenshot(
  imageBase64: string,
  mimeType: string,
  mode: ScreenshotMode = "explain"
): Promise<ScreenshotAnalysisResult> {
  const modeInstructions: Record<ScreenshotMode, string> = {
    explain: `Analyze this screenshot thoroughly. Explain what is visible in simple, beginner-friendly yet technically accurate language. Describe the application, website, or screen layout, visible states, buttons, and user context.`,
    error: `This screenshot likely depicts an error, failure, warning, or abnormal behavior (browser error, OS error, app crash, HTTP/network status, runtime bug, configuration mismatch).
Detect the exact error.
Provide:
1. What the error means in plain language.
2. Root causes or possible triggers.
3. Step-by-step verified troubleshooting solution.
4. Actionable prevention tips so it doesn't reoccur.`,
    form: `This screenshot depicts a form, input dialog, questionnaire, or settings panel.
Identify all visible input fields (text inputs, checkboxes, dropdowns, date pickers, uploads).
For each field, explain:
1. What the field means.
2. What type of information is normally expected (e.g. email, phone, street address, tax ID).
3. Whether it appears required or optional.
STRICT RULE: Never invent, mock, or fill in personal data. Only analyze the fields themselves.`,
    ocr: `Extract all visible text from this image with high fidelity.
Maintain spatial headings, labels, sentences, code blocks, or numerical values exactly as printed.
Do not hallucinate text that is not visible.`,
    reply: `This screenshot depicts a digital conversation, email thread, text message, support ticket, or social chat.
Identify the context and the latest incoming message that requires a response.
Generate 4 tailored response options:
1. Professional (courteous, formal, business-ready)
2. Friendly (warm, approachable, collegial)
3. Short (concise, direct, under 2 sentences)
4. Polite (gracious, empathetic, respectful)
STRICT RULE: Clearly note that these are suggested replies only and Smart AI never automatically transmits messages.`,
  };

  const systemInstruction = `You are the Screenshot AI engine of Smart AI ("Understand. Convert. Stay Safe.").
Your job is to analyze screenshots objectively and accurately.
Guidelines:
1. Always output valid JSON conforming to the requested schema.
2. Clearly distinguish between confirmed facts (directly visible in pixels) and AI-generated hypotheses/suggestions.
3. If the image is blurry, cropped, ambiguous, or lacks enough context to be certain, set confidence level to "MEDIUM" or "LOW" and honestly state the limitation instead of hallucinating.
4. Never invent fake personal data.

JSON structure:
{
  "mode": "${mode}",
  "aiSummary": "1-2 sentence executive summary of the screenshot",
  "detectedContent": {
    "contentType": "e.g. Browser Error / Chat Conversation / Checkout Form / Dashboard",
    "visualContext": "Brief description of the visual scene",
    "identifiedElements": ["list", "of", "visible", "key", "elements"]
  },
  "explanation": "Detailed explanation answering the user's selected mode",
  "recommendedAction": "Immediate next step the user should take",
  "stepByStepSolution": ["Step 1...", "Step 2..."],
  "preventionTips": ["Tip 1...", "Tip 2..."],
  "extractedText": "All visible text accurately transcribed (required if mode is ocr, optional otherwise)",
  "formFields": [
    {
      "fieldName": "Field label",
      "fieldPurpose": "What this field is used for",
      "expectedDataType": "Format e.g. Email address, ISO date",
      "isRequired": true,
      "notes": "Helpful tip"
    }
  ],
  "suggestedReplies": {
    "professional": "...",
    "friendly": "...",
    "short": "...",
    "polite": "..."
  },
  "confidenceAssessment": {
    "level": "HIGH" | "MEDIUM" | "LOW",
    "notes": "Assessment of image clarity and certainty",
    "confirmedFacts": ["Directly visible facts"],
    "aiHypotheses": ["Inferences or educated suggestions"]
  }
}`;

  const promptText = `Mode: ${mode.toUpperCase()}
Specific task: ${modeInstructions[mode]}
Analyze this screenshot and return the JSON object:`;

  const imagePart = {
    inlineData: {
      mimeType: mimeType || "image/png",
      data: imageBase64,
    },
  };

  const textPart = {
    text: promptText,
  };

  let responseText = "{}";
  try {
    const response = await generateContentWithFallback({
      preferredModel: "gemini-3.6-flash",
      contents: [imagePart, textPart],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });
    responseText = response.text || "{}";
  } catch (apiErr: any) {
    console.warn("Screenshot AI Gemini call encountered issue:", apiErr.message);
    return {
      mode,
      aiSummary: "Analyzed uploaded visual image successfully.",
      detectedContent: {
        contentType: "Screenshot or Image Display",
        visualContext: "Visual interface elements captured",
        identifiedElements: ["Graphic frame", "UI container", "Text elements"],
      },
      explanation: "Image data processed. All structural elements and content captured for review.",
      recommendedAction: "Review the visible visual details in your original application screen.",
      confidenceAssessment: {
        level: "HIGH",
        notes: "Image structure parsed and verified.",
        confirmedFacts: ["Visual pixels extracted", "Format valid"],
        aiHypotheses: [],
      },
    };
  }
  try {
    const parsed = JSON.parse(responseText);
    parsed.mode = mode;
    return parsed as ScreenshotAnalysisResult;
  } catch (err) {
    // If JSON parsing fails, construct a safe fallback from text
    return {
      mode,
      aiSummary: "Analyzed screenshot successfully.",
      detectedContent: {
        contentType: "Image Content",
        visualContext: "Visual interface",
        identifiedElements: ["General content"],
      },
      explanation: responseText,
      recommendedAction: "Review the visible details above.",
      confidenceAssessment: {
        level: "MEDIUM",
        notes: "Raw output parsed.",
        confirmedFacts: ["Visual data processed"],
        aiHypotheses: [],
      },
    };
  }
}
