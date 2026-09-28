import { PagesFunction, jsonResponse, handleOptions } from "../../types";

type ScreenshotMode = "explain" | "error" | "form" | "ocr" | "reply";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return handleOptions(request);
};

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      {
        error: "GEMINI_API_KEY environment variable is not configured on Cloudflare.",
        details: "Please add GEMINI_API_KEY in Cloudflare Pages Settings -> Environment variables.",
      },
      500,
      request
    );
  }

  try {
    let base64Data = "";
    let mimeType = "image/png";
    let mode: ScreenshotMode = "explain";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image");
      const modeParam = formData.get("mode") as string | null;
      if (modeParam && ["explain", "error", "form", "ocr", "reply"].includes(modeParam)) {
        mode = modeParam as ScreenshotMode;
      }

      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const buffer = await (file as File).arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
        mimeType = (file as File).type || "image/png";
      }
    } else {
      const body = (await request.json().catch(() => ({}))) as any;
      if (body.mode && ["explain", "error", "form", "ocr", "reply"].includes(body.mode)) {
        mode = body.mode as ScreenshotMode;
      }

      if (body.imageBase64 && typeof body.imageBase64 === "string") {
        const raw = body.imageBase64;
        if (raw.includes(",")) {
          const parts = raw.split(",");
          base64Data = parts[1];
          const match = parts[0].match(/:(.*?);/);
          if (match) mimeType = match[1];
        } else {
          base64Data = raw;
        }
      }
    }

    if (!base64Data) {
      return jsonResponse({ error: "Please upload or provide an image to analyze." }, 400, request);
    }

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
2. What type of information is normally expected.
3. Whether it appears required or optional.
STRICT RULE: Never invent personal data.`,
      ocr: `Extract all visible text from this image with high fidelity.
Maintain spatial headings, labels, sentences, code blocks, or numerical values exactly as printed.
Do not hallucinate text that is not visible.`,
      reply: `This screenshot depicts a digital conversation, email thread, text message, support ticket, or social chat.
Identify the context and the latest incoming message that requires a response.
Generate 4 tailored response options:
1. Professional
2. Friendly
3. Short
4. Polite
STRICT RULE: Clearly note that these are suggested replies only.`,
    };

    const systemInstruction = `You are the Screenshot AI engine of Smart AI ("Understand. Convert. Stay Safe.").
Analyze screenshots objectively and accurately.
Output valid JSON matching schema:
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
  "extractedText": "All visible text accurately transcribed",
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
    "level": "HIGH",
    "notes": "Assessment of image clarity and certainty",
    "confirmedFacts": ["Directly visible facts"],
    "aiHypotheses": ["Inferences or educated suggestions"]
  }
}`;

    const promptText = `Mode: ${mode.toUpperCase()}
Specific task: ${modeInstructions[mode]}
Analyze this screenshot and return the JSON object:`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    };

    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let responseJson: any = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "smart-ai-cloudflare",
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          throw new Error(`Model ${model} returned HTTP ${geminiRes.status}: ${errText}`);
        }

        const data = (await geminiRes.json()) as any;
        const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOutput) {
          responseJson = JSON.parse(textOutput);
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!responseJson) {
      const sanitizedError = apiKey && lastError ? (lastError.message || "").replaceAll(apiKey, "[REDACTED]") : (lastError?.message || "Failed to obtain AI analysis from Gemini.");
      throw new Error(sanitizedError);
    }

    return jsonResponse(
      {
        success: true,
        data: responseJson,
        usage: {
          remaining: 5,
          total: 5,
        },
      },
      200,
      request
    );
  } catch (err: any) {
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
