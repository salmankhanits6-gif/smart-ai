import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { SEO_PAGES, SeoPageConfig } from "../src/lib/seoData";

export interface PublicSiteUrlInfo {
  baseUrl: string;
  source: "PUBLIC_SITE_URL" | "APP_URL" | "REQUEST_HEADER" | "FALLBACK";
}

export function getPublicSiteUrlInfo(req?: Request): PublicSiteUrlInfo {
  // 1. Explicit production override: PUBLIC_SITE_URL
  if (process.env.PUBLIC_SITE_URL && process.env.PUBLIC_SITE_URL.startsWith("http")) {
    return {
      baseUrl: process.env.PUBLIC_SITE_URL.replace(/\/+$/, ""),
      source: "PUBLIC_SITE_URL",
    };
  }

  // 2. Standard Cloud Run / AI Studio container environment: APP_URL
  // In AI Studio, the public shared production deployment is 'ais-pre-...'
  // If APP_URL is the internal development container ('ais-dev-...'), map it to the public PRE production origin.
  if (process.env.APP_URL && process.env.APP_URL.startsWith("http")) {
    const preOrigin = process.env.APP_URL.replace("ais-dev-", "ais-pre-").replace(/\/+$/, "");
    return {
      baseUrl: preOrigin,
      source: "APP_URL",
    };
  }

  // 3. Dynamic header detection if within an HTTP request (strictly sanitized against Host Header Injection)
  if (req) {
    const rawProto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const proto = rawProto === "http" || rawProto === "https" ? rawProto : "https";
    const rawHost = req.headers["x-forwarded-host"] || req.headers.host;
    // Strict Host validation: allow only valid domain names / IPv4 / IPv6 and optional port
    // Reject any CRLF, whitespace, path traversal, quotes, or script characters
    if (
      typeof rawHost === "string" &&
      /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?$/.test(rawHost)
    ) {
      const sanitizedHost = rawHost.replace("ais-dev-", "ais-pre-");
      return {
        baseUrl: `${proto}://${sanitizedHost}`.replace(/\/+$/, ""),
        source: "REQUEST_HEADER",
      };
    }
  }

  // 4. Default public production fallback domain
  return {
    baseUrl: process.env.PUBLIC_SITE_URL || "https://smartai.tools",
    source: "FALLBACK",
  };
}

export function getBaseUrl(req?: Request): string {
  return getPublicSiteUrlInfo(req).baseUrl;
}

export function handleRobotsTxt(req: Request, res: Response) {
  const baseUrl = getBaseUrl(req);
  const content = `# Robots.txt for Smart AI
# Production Search Engine Directive

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

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.status(200).send(content);
}

export function handleSitemapXml(req: Request, res: Response) {
  const baseUrl = getBaseUrl(req);
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

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send(xml);
}

export function generateStructuredData(page: SeoPageConfig, baseUrl: string): object[] {
  const canonicalUrl = `${baseUrl}${page.path}`;
  const ogImageUrl = `${baseUrl}/og-image.png`;

  const schemas: object[] = [];

  // 1. WebSite / Organization for Home
  if (page.path === "/") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Smart AI",
      "url": baseUrl,
      "description": page.metaDescription,
      "publisher": {
        "@type": "Organization",
        "name": "Smart AI",
        "url": baseUrl,
        "logo": {
          "@type": "ImageObject",
          "url": ogImageUrl,
        },
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${baseUrl}/file-tools?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    });

    schemas.push({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Smart AI",
      "url": baseUrl,
      "logo": ogImageUrl,
      "description": "Next-generation everyday AI utility platform for file conversions, screenshot analysis, and threat detection.",
    });
  }

  // 2. WebApplication for all tool pages
  if (page.schemaType === "WebApplication") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": page.h1,
      "url": canonicalUrl,
      "description": page.metaDescription,
      "applicationCategory": page.appCategory || "UtilitiesApplication",
      "operatingSystem": "All",
      "browserRequirements": "Requires HTML5 compliant web browser",
      "image": ogImageUrl,
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
      },
      "featureList": page.howToSteps.map((s) => s.title).join(", "),
    });
  }

  // 3. BreadcrumbList for non-home pages
  if (page.path !== "/") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": baseUrl,
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": page.h1,
          "item": canonicalUrl,
        },
      ],
    });
  }

  // 4. FAQPage where FAQs exist
  if (page.faqs && page.faqs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": page.faqs.map((faq) => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer,
        },
      })),
    });
  }

  return schemas;
}

export function generateCrawlableHtml(page: SeoPageConfig, baseUrl: string): string {
  const stepsList = page.howToSteps
    .map(
      (s) => `
      <li style="margin-bottom: 12px;">
        <strong>Step ${s.stepNumber}: ${escapeHtml(s.title)}</strong>
        <p style="margin: 4px 0 0 0; color: #475569;">${escapeHtml(s.description)}</p>
      </li>`
    )
    .join("\n");

  const formatsList = page.supportedFormats
    .map(
      (f) => `
      <li style="margin-bottom: 8px;">
        <strong>${escapeHtml(f.category)}:</strong> ${escapeHtml(f.formats.join(", "))} 
        <span style="color: #64748b; font-size: 13px;">(${escapeHtml(f.note)})</span>
      </li>`
    )
    .join("\n");

  const specsList = page.technicalSpecifications
    .map(
      (spec) => `
      <li style="margin-bottom: 6px;">
        <strong>${escapeHtml(spec.label)}:</strong> <span>${escapeHtml(spec.value)}</span>
      </li>`
    )
    .join("\n");

  const faqsList = page.faqs
    .map(
      (faq) => `
      <div style="margin-bottom: 16px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h3 style="font-size: 16px; margin: 0 0 8px 0; color: #0f172a;">${escapeHtml(faq.question)}</h3>
        <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6;">${escapeHtml(faq.answer)}</p>
      </div>`
    )
    .join("\n");

  const relatedToolsList = page.relatedTools
    .map(
      (rt) => `
      <div style="display: inline-block; margin: 0 12px 12px 0;">
        <a href="${baseUrl}${rt.path}" style="color: #2563eb; font-weight: 600; text-decoration: underline;">
          ${escapeHtml(rt.name)}
        </a>
        <span style="color: #64748b; font-size: 13px;"> – ${escapeHtml(rt.description)}</span>
      </div>`
    )
    .join("\n");

  return `
    <article id="seo-crawlable-content" style="max-width: 900px; margin: 40px auto; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
      <header>
        <span style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 12px;">
          ${escapeHtml(page.badge)}
        </span>
        <h1 style="font-size: 32px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">
          ${escapeHtml(page.h1)}
        </h1>
        <p style="font-size: 18px; color: #475569; margin: 0 0 20px 0;">
          ${escapeHtml(page.subheading)}
        </p>
      </header>

      <section style="margin-bottom: 28px;">
        <p style="font-size: 15px; color: #334155; line-height: 1.7;">
          ${escapeHtml(page.introParagraph)}
        </p>
      </section>

      <section style="margin-bottom: 32px;">
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          How to Use ${escapeHtml(page.h1)}
        </h2>
        <ol style="padding-left: 20px; font-size: 15px;">
          ${stepsList}
        </ol>
      </section>

      <section style="margin-bottom: 32px;">
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          Supported File Formats &amp; Specifications
        </h2>
        <ul style="list-style-type: square; padding-left: 20px; font-size: 14px;">
          ${formatsList}
        </ul>
      </section>

      <section style="margin-bottom: 32px;">
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          Technical Architecture &amp; Privacy
        </h2>
        <ul style="padding-left: 20px; font-size: 14px;">
          ${specsList}
        </ul>
        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin-top: 16px; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px; color: #1e293b;">
            <strong>Privacy Commitment:</strong> ${escapeHtml(page.privacyCommitment)}
          </p>
        </div>
      </section>

      <section style="margin-bottom: 32px;">
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          Frequently Asked Questions
        </h2>
        <div>
          ${faqsList}
        </div>
      </section>

      <section style="margin-bottom: 32px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          Related Smart AI Tools
        </h2>
        <div style="margin-top: 12px;">
          ${relatedToolsList}
        </div>
      </section>

      <footer style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        <p>&copy; ${new Date().getFullYear()} Smart AI. All rights reserved. Direct client and browser execution supported.</p>
      </footer>
    </article>
  `;
}

export function renderPageWithSeo(
  templateHtml: string,
  page: SeoPageConfig,
  baseUrl: string
): string {
  const canonicalUrl = `${baseUrl}${page.path}`;
  const ogImageUrl = `${baseUrl}/og-image.png`;
  const schemas = generateStructuredData(page, baseUrl);
  const siteVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const siteVerificationTag = siteVerification
    ? `\n    <!-- Google Search Console Site Verification -->\n    <meta name="google-site-verification" content="${escapeHtml(siteVerification)}" />`
    : "";

  const headInjection = `
    <!-- Primary SEO Meta Tags -->
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.metaDescription)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />${siteVerificationTag}

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(page.title)}" />
    <meta property="og:description" content="${escapeHtml(page.metaDescription)}" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Smart AI Everyday Utilities Platform" />
    <meta property="og:site_name" content="Smart AI" />

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    <meta name="twitter:title" content="${escapeHtml(page.title)}" />
    <meta name="twitter:description" content="${escapeHtml(page.metaDescription)}" />
    <meta name="twitter:image" content="${ogImageUrl}" />

    <!-- Schema.org JSON-LD Structured Data -->
    <script type="application/ld+json">
${JSON.stringify(schemas, null, 2)}
    </script>
  `;

  // Strip existing title and meta tags to avoid duplicates
  let html = templateHtml
    .replace(/<title>.*?<\/title>/i, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "");

  // Insert head tags before </head>
  html = html.replace("</head>", `${headInjection}\n  </head>`);

  // Include crawlable semantic content inside the root div and noscript fallback
  // This ensures search engine web crawlers immediately find the H1, semantic text, and links in the initial HTML
  const crawlableBody = generateCrawlableHtml(page, baseUrl);

  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">\n${crawlableBody}\n</div>\n<noscript>\n${crawlableBody}\n</noscript>`
  );

  return html;
}

export function render404Page(templateHtml: string, baseUrl: string, requestedPath: string): string {
  const headInjection = `
    <title>Page Not Found – 404 | Smart AI</title>
    <meta name="description" content="The requested page could not be found. Explore Smart AI's free tools for screenshots, image background removal, and file conversion." />
    <meta name="robots" content="noindex, nofollow" />
  `;

  let html = templateHtml
    .replace(/<title>.*?<\/title>/i, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "");

  html = html.replace("</head>", `${headInjection}\n  </head>`);

  const notFoundContent = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; text-align: center;">
      <div style="max-width: 540px; background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 40px 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="width: 56px; height: 56px; background-color: #eff6ff; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
          <span style="font-size: 28px;">🔍</span>
        </div>
        <h1 style="font-size: 28px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">Page Not Found (404)</h1>
        <p style="font-size: 15px; color: #64748b; line-height: 1.6; margin: 0 0 24px 0;">
          The page <code>${escapeHtml(requestedPath)}</code> could not be found. It may have been moved or removed.
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
          <a href="${baseUrl}/" style="display: block; padding: 12px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">
            Return to Homepage
          </a>
          <a href="${baseUrl}/image-background-remover" style="display: block; padding: 10px 20px; background-color: #f1f5f9; color: #1e293b; text-decoration: none; border-radius: 12px; font-weight: 500; font-size: 13px;">
            AI Background Remover
          </a>
          <a href="${baseUrl}/jpg-to-pdf" style="display: block; padding: 10px 20px; background-color: #f1f5f9; color: #1e293b; text-decoration: none; border-radius: 12px; font-weight: 500; font-size: 13px;">
            JPG to PDF Converter
          </a>
          <a href="${baseUrl}/screenshot-ai" style="display: block; padding: 10px 20px; background-color: #f1f5f9; color: #1e293b; text-decoration: none; border-radius: 12px; font-weight: 500; font-size: 13px;">
            Screenshot AI Tool
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          Smart AI • Real Everyday Digital Utilities
        </p>
      </div>
    </div>
  `;

  html = html.replace('<div id="root"></div>', `<div id="root">${notFoundContent}</div>`);
  return html;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
