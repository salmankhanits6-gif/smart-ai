import { PagesFunction, getBaseUrl } from "./types";
import { SEO_PAGES } from "../src/lib/seoData";

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  // 1. Permanent redirect for legacy background-remover route
  if (pathname === "/background-remover") {
    return Response.redirect(`${url.origin}/image-background-remover`, 301);
  }

  // 1b. Direct static passthrough for Google Search Console verification files
  if (pathname.startsWith("/google") && pathname.endsWith(".html")) {
    return context.next();
  }

  // 2. Pass request to static assets or API functions
  const response = await context.next();

  // If not HTML (e.g. static assets, images, API JSON), return untouched
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  // 3. Match canonical SEO page
  const page = SEO_PAGES[pathname];
  if (!page) {
    return response;
  }

  const baseUrl = getBaseUrl(request, env);
  const canonicalUrl = `${baseUrl}${page.path}`;
  const ogImageUrl = `${baseUrl}/og-image.png`;

  // 4. Construct Schema.org JSON-LD
  const schemas: any[] = [];
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
    });
  }
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

  // 5. Use Cloudflare native HTMLRewriter for server-side SEO injection
  const rewriter = new HTMLRewriter()
    .on("title", {
      element(element) {
        element.setInnerContent(page.title);
      },
    })
    .on('meta[name="description"]', {
      element(element) {
        element.setAttribute("content", page.metaDescription);
      },
    })
    .on('meta[property="og:title"]', {
      element(element) {
        element.setAttribute("content", page.title);
      },
    })
    .on('meta[property="og:description"]', {
      element(element) {
        element.setAttribute("content", page.metaDescription);
      },
    })
    .on("head", {
      element(element) {
        element.append(`<link rel="canonical" href="${canonicalUrl}" />`, { html: true });
        element.append(`<meta property="og:url" content="${canonicalUrl}" />`, { html: true });
        element.append(`<meta property="og:image" content="${ogImageUrl}" />`, { html: true });
        element.append(`<meta name="twitter:title" content="${page.title}" />`, { html: true });
        element.append(`<meta name="twitter:description" content="${page.metaDescription}" />`, { html: true });
        element.append(`<meta name="twitter:image" content="${ogImageUrl}" />`, { html: true });
        element.append(`<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`, { html: true });
        if (schemas.length > 0) {
          element.append(
            `<script type="application/ld+json">${JSON.stringify(schemas.length === 1 ? schemas[0] : schemas)}</script>`,
            { html: true }
          );
        }
      },
    });

  const modifiedResponse = rewriter.transform(response);
  const headers = new Headers(modifiedResponse.headers);
  headers.set("X-Robots-Tag", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

  return new Response(modifiedResponse.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
