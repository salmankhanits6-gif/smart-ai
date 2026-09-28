import { PagesFunction, jsonResponse, handleOptions } from "../types";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return handleOptions(request);
};

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const hasGeminiKey = !!(env.GEMINI_API_KEY || env.GOOGLE_API_KEY);
  return jsonResponse(
    {
      status: "ok",
      service: "Smart AI",
      version: "1.0.0",
      hasGeminiKey,
      platform: "cloudflare-pages",
      backendConfigured: !!(env.BACKEND_SERVICE_URL || env.EXTERNAL_API_URL),
    },
    200,
    request
  );
};
