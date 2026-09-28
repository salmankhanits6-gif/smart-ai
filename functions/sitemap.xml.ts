import { PagesFunction, getBaseUrl } from "./types";
import { SEO_PAGES } from "../src/lib/seoData";

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const baseUrl = getBaseUrl(request, env);
  const today = new Date().toISOString().split("T")[0];

  const urlEntries = Object.values(SEO_PAGES).map((page) => {
    const isHome = page.path === "/";
    const priority = isHome ? "1.0" : page.path.startsWith("/image-") || page.path.includes("to-") ? "0.9" : "0.8";
    const changefreq = isHome ? "daily" : "weekly";

    return `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("\n")}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
