export interface Env {
  GEMINI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  PUBLIC_SITE_URL?: string;
  BACKEND_SERVICE_URL?: string;
  EXTERNAL_API_URL?: string;
  AUTH_SECRET?: string;
}

export interface EventContext<TEnv = Env, TParams = any, TData = Record<string, unknown>> {
  request: Request;
  env: TEnv;
  params: TParams;
  data: TData;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  waitUntil: (promise: Promise<any>) => void;
}

export type PagesFunction<TEnv = Env> = (
  context: EventContext<TEnv, any, Record<string, unknown>>
) => Response | Promise<Response>;

declare global {
  class HTMLRewriter {
    on(selector: string, handlers: { element?: (el: any) => void; text?: (text: any) => void }): this;
    transform(response: Response): Response;
  }
}

export function getBaseUrl(request: Request, env: Env): string {
  if (env.PUBLIC_SITE_URL && env.PUBLIC_SITE_URL.startsWith("http")) {
    return env.PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Range, Accept",
    "Access-Control-Expose-Headers":
      "Content-Disposition, Content-Type, Content-Length, X-Original-Size, X-Output-Size, X-Page-Count, X-Word-Count, X-Job-Id, X-Reduction-Percent, X-Width, X-Height, X-Has-Alpha, X-Confidence, X-Is-Scanned, X-Is-Zip",
  };

  // If origin is present, echo specific origin with credentials and Vary header
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Vary"] = "Origin";
  } else {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

export function jsonResponse(
  data: any,
  status = 200,
  request?: Request,
  additionalHeaders: HeadersInit = {}
): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    ...(request ? corsHeaders(request) : {}),
    ...additionalHeaders,
  });

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

export function handleOptions(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

// WebCrypto-based HMAC JWT token generator & validator for Edge functions
// Implements time-limited expiration and tamper-resistant signatures
export async function signToken(
  payload: Record<string, any>,
  secret: string,
  expiresInSeconds = 7 * 86400 // 7 days default
): Promise<string> {
  const encoder = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedPayload = btoa(JSON.stringify(fullPayload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret || "smart-ai-default-auth-secret-key-2026"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${encodedSignature}`;
}

export async function verifyToken(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret || "smart-ai-default-auth-secret-key-2026"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Decode base64url signature
    const binarySignature = atob(encodedSignature.replace(/-/g, "+").replace(/_/g, "/"));
    const sigBytes = new Uint8Array(binarySignature.length);
    for (let i = 0; i < binarySignature.length; i++) {
      sigBytes[i] = binarySignature.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(data));
    if (!isValid) return null;

    const payloadJson = atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);

    // Enforce time-limited expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return null; // Expired token
    }

    return payload;
  } catch {
    return null;
  }
}
