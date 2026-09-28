import { PagesFunction, getBaseUrl } from "./types";

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const baseUrl = getBaseUrl(request, env);
  const content = `# Robots.txt for Smart AI
# Production Search Engine Directive (Cloudflare Pages)

User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /tmp/
Disallow: /auth/
Disallow: /private/
Disallow: /processing/
Disallow: /passport-photo
Disallow: /photo-maker

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
`;

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
};
