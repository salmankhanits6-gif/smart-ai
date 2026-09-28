import { PagesFunction, jsonResponse, handleOptions, getBaseUrl } from "../../types";
import { SEO_PAGES } from "../../../src/lib/seoData";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return handleOptions(request);
};

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const baseUrl = getBaseUrl(request, env);
  const totalPages = Object.keys(SEO_PAGES).length;

  return jsonResponse(
    {
      timestamp: new Date().toISOString(),
      baseUrl,
      platform: "cloudflare-pages",
      canonicalDomain: baseUrl,
      seoPagesCount: totalPages,
      sitemapUrl: `${baseUrl}/sitemap.xml`,
      robotsUrl: `${baseUrl}/robots.txt`,
      googleVerificationUrl: `${baseUrl}/google0fdc91d48d434718.html`,
      status: "OPTIMAL",
    },
    200,
    request
  );
};
