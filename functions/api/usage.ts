import { PagesFunction, jsonResponse, handleOptions, verifyToken } from "../types";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return handleOptions(request);
};

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const authHeader = request.headers.get("Authorization");
  let isAuthenticated = false;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const secret = env.AUTH_SECRET || env.GEMINI_API_KEY || "smart-ai-auth-secret";
    const user = await verifyToken(token, secret);
    if (user) {
      isAuthenticated = true;
    }
  }

  const limits = isAuthenticated
    ? {
        screenshotAi: 25,
        scamChecker: 50,
        fileTools: 100,
      }
    : {
        screenshotAi: 5,
        scamChecker: 10,
        fileTools: 20,
      };

  return jsonResponse(
    {
      limits,
      used: {
        screenshotAi: 0,
        scamChecker: 0,
        fileTools: 0,
      },
      remaining: limits,
    },
    200,
    request
  );
};
