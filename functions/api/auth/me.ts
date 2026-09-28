import { PagesFunction, jsonResponse, handleOptions, verifyToken } from "../../types";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return handleOptions(request);
};

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Not authenticated." }, 401, request);
  }

  const token = authHeader.substring(7).trim();
  const secret = env.AUTH_SECRET || env.GEMINI_API_KEY || "smart-ai-auth-secret";
  const user = await verifyToken(token, secret);

  if (!user) {
    return jsonResponse({ error: "Invalid or expired session token." }, 401, request);
  }

  return jsonResponse({ user }, 200, request);
};
