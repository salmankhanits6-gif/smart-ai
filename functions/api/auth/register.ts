import { PagesFunction, jsonResponse, handleOptions, signToken } from "../../types";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return handleOptions(request);
};

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const body = await request.json().catch(() => ({})) as any;
    const { email, password, name } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return jsonResponse({ error: "A valid email address is required." }, 400, request);
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return jsonResponse({ error: "Password must be at least 6 characters long." }, 400, request);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const displayName = (name && typeof name === "string" && name.trim()) ? name.trim() : normalizedEmail.split("@")[0];
    const id = "usr_" + Math.random().toString(36).substring(2, 10);
    const createdAt = new Date().toISOString();

    const secret = env.AUTH_SECRET || env.GEMINI_API_KEY || "smart-ai-auth-secret";
    const token = await signToken({ id, email: normalizedEmail, name: displayName, createdAt }, secret);

    return jsonResponse(
      {
        user: {
          id,
          email: normalizedEmail,
          name: displayName,
          createdAt,
        },
        token,
      },
      200,
      request
    );
  } catch (err: any) {
    return jsonResponse({ error: err.message || "Registration failed." }, 400, request);
  }
};
