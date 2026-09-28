import { PagesFunction, handleOptions, corsHeaders } from "../types";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return handleOptions(request);
};

export const onRequest: PagesFunction = async ({ request, env, params }) => {
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }

  const backendUrl = (env.BACKEND_SERVICE_URL || env.EXTERNAL_API_URL || "").replace(/\/+$/, "");
  const catchall = params.catchall as string[] | string | undefined;
  const pathPart = Array.isArray(catchall) ? catchall.join("/") : (catchall || "");

  if (backendUrl) {
    try {
      const targetUrl = new URL(`${backendUrl}/api/${pathPart}`);
      const sourceUrl = new URL(request.url);
      targetUrl.search = sourceUrl.search;

      // Clone headers and forward
      const headers = new Headers(request.headers);
      headers.set("X-Forwarded-Host", sourceUrl.host);
      headers.set("X-Forwarded-Proto", sourceUrl.protocol.replace(":", ""));
      headers.delete("host");

      const fetchOptions: RequestInit = {
        method: request.method,
        headers,
        redirect: "follow",
      };

      if (request.method !== "GET" && request.method !== "HEAD") {
        fetchOptions.body = request.body;
        // @ts-ignore
        fetchOptions.duplex = "half";
      }

      const backendResponse = await fetch(targetUrl.toString(), fetchOptions);

      // Clone response headers and attach CORS
      const resHeaders = new Headers(backendResponse.headers);
      const cors = corsHeaders(request) as Record<string, string>;
      for (const [k, v] of Object.entries(cors)) {
        resHeaders.set(k, v);
      }

      return new Response(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: resHeaders,
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: "Failed to connect to backend service.",
          details: err.message,
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request),
          },
        }
      );
    }
  }

  // If no backend service is configured
  return new Response(
    JSON.stringify({
      error: "This file conversion / AI background feature requires the Smart AI companion backend service.",
      endpoint: `/api/${pathPart}`,
      requiredBackend: true,
      technicalReason:
        "Native binary modules (sharp C++ libvips, ONNX background neural networks, Tesseract OCR) exceed Cloudflare Workers runtime isolate constraints and require a Node.js container.",
      solution:
        "Deploy the backend using server.ts to a free Node.js container (e.g. Render, Railway, Fly.io, or Cloud Run) and set BACKEND_SERVICE_URL in your Cloudflare Pages dashboard under Settings -> Environment variables.",
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(request),
      },
    }
  );
};
