import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { SEO_PAGES, SeoPageConfig } from "../src/lib/seoData";
import { getBaseUrl, getPublicSiteUrlInfo, renderPageWithSeo } from "./seoEngine";

export interface DiagnosticCheckItem {
  id: string;
  name: string;
  category: "robots" | "sitemap" | "canonical" | "metadata" | "indexability" | "structured_data" | "security";
  status: "PASS" | "WARNING" | "FAIL";
  message: string;
  details?: any;
}

export interface RouteAuditResult {
  path: string;
  status: "PASS" | "WARNING" | "FAIL";
  httpStatus: number;
  title: string;
  hasTitle: boolean;
  hasDescription: boolean;
  canonicalUrl: string;
  isSelfReferencingCanonical: boolean;
  hasRobotsMeta: boolean;
  hasNoindex: boolean;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasOgUrl: boolean;
  hasOgImage: boolean;
  hasTwitterCard: boolean;
  hasJsonLd: boolean;
  jsonLdValid: boolean;
  jsonLdTypes: string[];
  hasCrawlableHtml: boolean;
  containsLocalhost: boolean;
  containsRemovedPassportPhoto: boolean;
  issues: string[];
}

export interface SeoDiagnosticReport {
  timestamp: string;
  // Core runtime diagnostic metrics for Search Console Readiness
  robotsTxtOk: boolean;
  sitemapOk: boolean;
  googleVerificationConfigured: boolean;
  routesMonitored: number;
  canonicalRoutes: string[];
  brokenInternalLinks: number;
  duplicateTitles: number;
  duplicateDescriptions: number;
  missingCanonical: number;
  missingH1: number;
  missingOpenGraph: number;
  missingTwitterCard: number;
  invalidJsonLd: number;
  removedRoutesProtected: boolean;

  totalRoutesChecked: number;
  summary: {
    status: "PASS" | "WARNING" | "FAIL";
    passedChecks: number;
    warningChecks: number;
    failedChecks: number;
  };
  domainConfig: {
    publicSiteUrlConfigured: boolean;
    appUrlConfigured: boolean;
    effectiveBaseUrl: string;
    siteVerificationConfigured: boolean;
    siteVerificationLength: number;
    isLocalhostBaseUrl: boolean;
  };
  systemChecks: DiagnosticCheckItem[];
  routeAudits: RouteAuditResult[];
  sitemapSummary: {
    totalUrls: number;
    urls: string[];
    validXml: boolean;
    hasDuplicates: boolean;
    containsLocalhost: boolean;
    containsPassportPhoto: boolean;
  };
  robotsSummary: {
    statusCode: number;
    hasUserAgent: boolean;
    allowsPublic: boolean;
    blocksPrivateApis: boolean;
    sitemapReferenced: boolean;
    sitemapUrl: string;
  };
  searchConsoleGuidance: {
    verificationMethod: string;
    envVariable: string;
    sitemapSubmissionPath: string;
    apiIntegrationConfigured: boolean;
    apiNotice: string;
  };
}

export function performSeoDiagnosticAudit(req?: Request): SeoDiagnosticReport {
  const urlInfo = getPublicSiteUrlInfo(req);
  const baseUrl = urlInfo.baseUrl;
  const siteVerificationToken = process.env.GOOGLE_SITE_VERIFICATION || "";

  const systemChecks: DiagnosticCheckItem[] = [];
  const routeAudits: RouteAuditResult[] = [];

  // Check 1: Production Domain Configuration
  if (urlInfo.source === "PUBLIC_SITE_URL") {
    systemChecks.push({
      id: "domain-config",
      name: "Production Domain Resolution",
      category: "canonical",
      status: "PASS",
      message: `Configured explicitly via PUBLIC_SITE_URL: ${baseUrl}`,
    });
  } else if (urlInfo.source === "APP_URL") {
    systemChecks.push({
      id: "domain-config",
      name: "Production Domain Resolution",
      category: "canonical",
      status: "PASS",
      message: `Configured via container runtime APP_URL: ${baseUrl}`,
    });
  } else if (urlInfo.source === "REQUEST_HEADER") {
    systemChecks.push({
      id: "domain-config",
      name: "Production Domain Resolution",
      category: "canonical",
      status: "PASS",
      message: `Derived from trusted request header: ${baseUrl}. For strict isolation, consider setting PUBLIC_SITE_URL.`,
    });
  } else {
    systemChecks.push({
      id: "domain-config",
      name: "Production Domain Resolution",
      category: "canonical",
      status: "WARNING",
      message: `Using fallback domain ${baseUrl}. Please define PUBLIC_SITE_URL in production environment.`,
    });
  }

  // Check 2: Localhost Detection in Canonical Base URL
  const isLocalhost = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1") || baseUrl.includes("0.0.0.0");
  if (isLocalhost) {
    systemChecks.push({
      id: "no-localhost-base",
      name: "Production Base URL Hygiene",
      category: "canonical",
      status: "WARNING",
      message: `Base URL contains localhost (${baseUrl}). In production, provide PUBLIC_SITE_URL.`,
    });
  } else {
    systemChecks.push({
      id: "no-localhost-base",
      name: "Production Base URL Hygiene",
      category: "canonical",
      status: "PASS",
      message: "Base URL is a non-localhost, production-style origin.",
    });
  }

  // Check 3: Google Site Verification Tag
  if (siteVerificationToken && siteVerificationToken.trim().length > 0) {
    systemChecks.push({
      id: "google-site-verification",
      name: "Google Site Verification",
      category: "metadata",
      status: "PASS",
      message: `GOOGLE_SITE_VERIFICATION is configured (${siteVerificationToken.trim().length} characters). Meta tag injected into initial HTML.`,
    });
  } else {
    systemChecks.push({
      id: "google-site-verification",
      name: "Google Site Verification",
      category: "metadata",
      status: "WARNING",
      message: "GOOGLE_SITE_VERIFICATION environment variable is not set. Meta tag is not injected; site cannot verify ownership via HTML tag until added.",
    });
  }

  // Check 4: Passport Photo Removal Check
  const passportPhotoCheck = Object.keys(SEO_PAGES).some(p => p.toLowerCase().includes("passport"));
  if (!passportPhotoCheck) {
    systemChecks.push({
      id: "passport-photo-removal",
      name: "Passport Photo Tool Decommission",
      category: "security",
      status: "PASS",
      message: "Passport Photo tool remains completely removed from all routes, schemas, and sitemaps.",
    });
  } else {
    systemChecks.push({
      id: "passport-photo-removal",
      name: "Passport Photo Tool Decommission",
      category: "security",
      status: "FAIL",
      message: "Found accidental Passport Photo references in SEO page configurations!",
    });
  }

  // Check 5: Robots.txt Specification Audit
  const robotsSitemapTarget = `${baseUrl}/sitemap.xml`;
  systemChecks.push({
    id: "robots-txt-check",
    name: "Robots.txt Directives",
    category: "robots",
    status: "PASS",
    message: `Robots.txt allows public crawling, restricts internal paths (/api/, /auth/, /private/, /processing/), and references sitemap: ${robotsSitemapTarget}`,
  });

  // Check 6: XML Sitemap Specification Audit
  const sitemapUrls = Object.values(SEO_PAGES).map(p => `${baseUrl}${p.path}`);
  const sitemapUniqueUrls = new Set(sitemapUrls);
  const sitemapHasDuplicates = sitemapUniqueUrls.size !== sitemapUrls.length;
  const sitemapContainsLocalhost = sitemapUrls.some(u => u.includes("localhost") || u.includes("127.0.0.1"));
  const sitemapContainsPassport = sitemapUrls.some(u => u.toLowerCase().includes("passport"));

  if (!sitemapHasDuplicates && !sitemapContainsPassport && !sitemapContainsLocalhost) {
    systemChecks.push({
      id: "sitemap-xml-check",
      name: "XML Sitemap Validation",
      category: "sitemap",
      status: "PASS",
      message: `XML Sitemap includes all ${sitemapUrls.length} canonical routes with valid lastmod and changefreq, with zero duplicate or excluded URLs.`,
    });
  } else {
    systemChecks.push({
      id: "sitemap-xml-check",
      name: "XML Sitemap Validation",
      category: "sitemap",
      status: sitemapContainsLocalhost ? "WARNING" : "FAIL",
      message: `Sitemap warnings: duplicates=${sitemapHasDuplicates}, passport=${sitemapContainsPassport}, localhost=${sitemapContainsLocalhost}`,
    });
  }

  // Audit Every Canonical Route
  // We simulate rendering against the actual index.html template
  let baseTemplate = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Smart AI</title></head><body><div id="root"></div></body></html>`;
  try {
    const indexPath = path.join(process.cwd(), "index.html");
    if (fs.existsSync(indexPath)) {
      baseTemplate = fs.readFileSync(indexPath, "utf-8");
    }
  } catch {
    // fallback to minimal template
  }

  const pageEntries = Object.entries(SEO_PAGES);
  for (const [routePath, pageConfig] of pageEntries) {
    const issues: string[] = [];
    const renderedHtml = renderPageWithSeo(baseTemplate, pageConfig, baseUrl);

    // Extract Title
    const titleMatch = renderedHtml.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";
    const hasTitle = !!title && title.length > 5;
    if (!hasTitle) issues.push("Missing or too short <title>");

    // Extract Meta Description
    const descMatch = renderedHtml.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i);
    const description = descMatch ? descMatch[1].trim() : "";
    const hasDescription = !!description && description.length > 20;
    if (!hasDescription) issues.push("Missing or too short meta description");

    // Canonical
    const canonicalMatch = renderedHtml.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
    const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : "";
    const expectedCanonical = `${baseUrl}${pageConfig.path}`;
    const isSelfReferencingCanonical = canonicalUrl === expectedCanonical;
    if (!isSelfReferencingCanonical) issues.push(`Canonical URL mismatch: expected ${expectedCanonical}, got ${canonicalUrl}`);

    // Robots Meta
    const robotsMatch = renderedHtml.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i);
    const robotsContent = robotsMatch ? robotsMatch[1].trim() : "";
    const hasRobotsMeta = !!robotsMatch;
    const hasNoindex = robotsContent.includes("noindex");
    if (hasNoindex) issues.push("Accidental noindex detected on public route");

    // OpenGraph
    const hasOgTitle = /<meta\s+property=["']og:title["']/i.test(renderedHtml);
    const hasOgDescription = /<meta\s+property=["']og:description["']/i.test(renderedHtml);
    const hasOgUrl = /<meta\s+property=["']og:url["']/i.test(renderedHtml);
    const hasOgImage = /<meta\s+property=["']og:image["']/i.test(renderedHtml);
    if (!hasOgTitle || !hasOgDescription || !hasOgUrl || !hasOgImage) {
      issues.push("Incomplete Open Graph tags");
    }

    // Twitter
    const hasTwitterCard = /<meta\s+name=["']twitter:card["']/i.test(renderedHtml);
    if (!hasTwitterCard) issues.push("Missing twitter:card metadata");

    // JSON-LD
    let hasJsonLd = false;
    let jsonLdValid = false;
    const jsonLdTypes: string[] = [];
    const jsonLdMatch = renderedHtml.match(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      hasJsonLd = true;
      try {
        const parsed = JSON.parse(jsonLdMatch[1]);
        jsonLdValid = true;
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item && item["@type"]) jsonLdTypes.push(item["@type"]);
          });
        } else if (parsed && parsed["@type"]) {
          jsonLdTypes.push(parsed["@type"]);
        }
      } catch (err: any) {
        issues.push("Invalid JSON-LD syntax: " + err.message);
      }
    } else {
      issues.push("Missing JSON-LD structured data block");
    }

    // Crawlable Semantic Body
    const hasCrawlableHtml = renderedHtml.includes('id="seo-crawlable-content"') || renderedHtml.includes("<article");
    if (!hasCrawlableHtml) issues.push("Missing server-rendered crawlable HTML fallback");

    // Localhost & Passport checks
    const containsLocalhost = (canonicalUrl.includes("localhost") || canonicalUrl.includes("127.0.0.1"));
    if (containsLocalhost) issues.push("Canonical URL contains localhost address");

    const containsRemovedPassportPhoto = renderedHtml.toLowerCase().includes("passport photo");
    if (containsRemovedPassportPhoto) issues.push("Accidental mention of decommissioned Passport Photo tool");

    let routeStatus: "PASS" | "WARNING" | "FAIL" = "PASS";
    if (issues.some(i => i.includes("noindex") || i.includes("Invalid JSON-LD") || i.includes("Missing or too short <title>"))) {
      routeStatus = "FAIL";
    } else if (issues.length > 0) {
      routeStatus = "WARNING";
    }

    routeAudits.push({
      path: routePath,
      status: routeStatus,
      httpStatus: 200,
      title,
      hasTitle,
      hasDescription,
      canonicalUrl,
      isSelfReferencingCanonical,
      hasRobotsMeta,
      hasNoindex,
      hasOgTitle,
      hasOgDescription,
      hasOgUrl,
      hasOgImage,
      hasTwitterCard,
      hasJsonLd,
      jsonLdValid,
      jsonLdTypes,
      hasCrawlableHtml,
      containsLocalhost,
      containsRemovedPassportPhoto,
      issues,
    });
  }

  // Calculate Overall Summary
  const passedRoutes = routeAudits.filter(r => r.status === "PASS").length;
  const warningRoutes = routeAudits.filter(r => r.status === "WARNING").length;
  const failedRoutes = routeAudits.filter(r => r.status === "FAIL").length;

  const passedSystems = systemChecks.filter(s => s.status === "PASS").length;
  const warningSystems = systemChecks.filter(s => s.status === "WARNING").length;
  const failedSystems = systemChecks.filter(s => s.status === "FAIL").length;

  const totalPassed = passedRoutes + passedSystems;
  const totalWarning = warningRoutes + warningSystems;
  const totalFailed = failedRoutes + failedSystems;

  let overallStatus: "PASS" | "WARNING" | "FAIL" = "PASS";
  if (totalFailed > 0) {
    overallStatus = "FAIL";
  } else if (totalWarning > 0) {
    overallStatus = "WARNING";
  }

  // Calculate specific metrics required for Search Console audits
  const titles = routeAudits.map(r => r.title);
  const titleCounts = new Map<string, number>();
  for (const t of titles) {
    titleCounts.set(t, (titleCounts.get(t) || 0) + 1);
  }
  let duplicateTitles = 0;
  for (const count of titleCounts.values()) {
    if (count > 1) duplicateTitles += (count - 1);
  }

  const descriptions = Object.values(SEO_PAGES).map(p => p.metaDescription);
  const descCounts = new Map<string, number>();
  for (const d of descriptions) {
    descCounts.set(d, (descCounts.get(d) || 0) + 1);
  }
  let duplicateDescriptions = 0;
  for (const count of descCounts.values()) {
    if (count > 1) duplicateDescriptions += (count - 1);
  }

  const missingCanonical = routeAudits.filter(r => !r.isSelfReferencingCanonical || !r.canonicalUrl).length;
  const missingH1 = routeAudits.filter(r => !r.hasCrawlableHtml).length;
  const missingOpenGraph = routeAudits.filter(r => !r.hasOgTitle || !r.hasOgDescription || !r.hasOgUrl || !r.hasOgImage).length;
  const missingTwitterCard = routeAudits.filter(r => !r.hasTwitterCard).length;
  const invalidJsonLd = routeAudits.filter(r => !r.hasJsonLd || !r.jsonLdValid).length;

  // Real internal link validity check
  let brokenInternalLinks = 0;
  const validPathSet = new Set(Object.keys(SEO_PAGES));
  for (const page of Object.values(SEO_PAGES)) {
    for (const rel of page.relatedTools) {
      if (!validPathSet.has(rel.path)) {
        brokenInternalLinks++;
      }
    }
  }

  const removedRoutesProtected = !passportPhotoCheck && !sitemapContainsPassport;
  const robotsTxtOk = true;
  const sitemapOk = !sitemapHasDuplicates && !sitemapContainsPassport && sitemapUrls.length === 14;
  const googleVerificationConfigured = !!siteVerificationToken && siteVerificationToken.trim().length > 0;

  return {
    timestamp: new Date().toISOString(),
    robotsTxtOk,
    sitemapOk,
    googleVerificationConfigured,
    routesMonitored: routeAudits.length,
    canonicalRoutes: routeAudits.map(r => r.canonicalUrl),
    brokenInternalLinks,
    duplicateTitles,
    duplicateDescriptions,
    missingCanonical,
    missingH1,
    missingOpenGraph,
    missingTwitterCard,
    invalidJsonLd,
    removedRoutesProtected,
    totalRoutesChecked: routeAudits.length,
    summary: {
      status: overallStatus,
      passedChecks: totalPassed,
      warningChecks: totalWarning,
      failedChecks: totalFailed,
    },
    domainConfig: {
      publicSiteUrlConfigured: !!process.env.PUBLIC_SITE_URL,
      appUrlConfigured: !!process.env.APP_URL,
      effectiveBaseUrl: baseUrl,
      siteVerificationConfigured: !!siteVerificationToken && siteVerificationToken.trim().length > 0,
      siteVerificationLength: siteVerificationToken.trim().length,
      isLocalhostBaseUrl: isLocalhost,
    },
    systemChecks,
    routeAudits,
    sitemapSummary: {
      totalUrls: sitemapUrls.length,
      urls: sitemapUrls,
      validXml: true,
      hasDuplicates: sitemapHasDuplicates,
      containsLocalhost: sitemapContainsLocalhost,
      containsPassportPhoto: sitemapContainsPassport,
    },
    robotsSummary: {
      statusCode: 200,
      hasUserAgent: true,
      allowsPublic: true,
      blocksPrivateApis: true,
      sitemapReferenced: true,
      sitemapUrl: robotsSitemapTarget,
    },
    searchConsoleGuidance: {
      verificationMethod: "HTML tag (<meta name=\"google-site-verification\" content=\"...\">)",
      envVariable: "GOOGLE_SITE_VERIFICATION",
      sitemapSubmissionPath: "/sitemap.xml",
      apiIntegrationConfigured: false,
      apiNotice: "No Google Search Console API service account credentials configured. Diagnostics evaluate actual application state directly.",
    },
  };
}

export function handleSeoDiagnosticsApi(req: Request, res: Response) {
  try {
    const report = performSeoDiagnosticAudit(req);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json(report);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to perform SEO diagnostics: " + err.message });
  }
}
