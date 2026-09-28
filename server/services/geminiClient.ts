import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

export function getGeminiAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Execute Gemini generateContent with automatic model fallback for 503 capacity spikes
 */
export async function generateContentWithFallback(options: {
  contents: any;
  config?: any;
  preferredModel?: string;
}): Promise<any> {
  const ai = getGeminiAI();
  const modelsToTry = [
    options.preferredModel || "gemini-3.6-flash",
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.8-flash",
  ].filter((v, i, a) => a.indexOf(v) === i);

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout calling model ${model}`)), 10000)
        ),
      ]) as any;
      return response;
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || "";
      // If 503, 429, capacity error, or unavailable, wait briefly and try the next model
      if (
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("high demand") ||
        msg.includes("404") ||
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota")
      ) {
        console.warn(`Model ${model} unavailable or rate-limited (${msg}), trying fallback...`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("All Gemini models currently unavailable.");
}
