# Google Search Console (GSC) & Indexing Readiness Guide

This comprehensive, production-grade manual details the exact steps for verifying, submitting, and maintaining the **Smart AI** platform in **Google Search Console** for rapid, error-free indexing.

---

## 1. Prerequisites & Environment Configuration

Smart AI is equipped with an automated, server-side Technical SEO engine. Ensure the following production environment variables are configured in your deployment settings:

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `PUBLIC_SITE_URL` | **Yes (in prod)** | The canonical public origin of your website. Ensures self-referencing canonical tags and XML sitemaps do not default to container hostnames or localhost. | `https://smartai.tools` |
| `GOOGLE_SITE_VERIFICATION` | **Recommended** | The Google Search Console HTML verification tag string provided by Google. Automatically injected as `<meta name="google-site-verification" content="..." />` into the HTML `<head>`. | `aBcD1234xYz_GoogleSiteVerificationToken` |
| `GEMINI_API_KEY` | **Yes** | Server-side Gemini API key powering Screenshot AI, Scam Checker, and document assistance. | `AIzaSy...` |

---

## 2. Step-by-Step Google Search Console Setup

### Step 2.1: Add Property in Google Search Console

1. Navigate to [Google Search Console](https://search.google.com/search-console).
2. Sign in with the Google Account that will manage the property.
3. In the property dropdown (top left), click **+ Add property**.
4. Choose **URL prefix** (recommended for Cloud Run / single domains with HTTPS):
   - Enter your exact canonical URL, e.g.: `https://smartai.tools/` (or your production Cloud Run URL).
   - Click **Continue**.

---

### Step 2.2: Site Ownership Verification

Smart AI supports two verification methods:

#### Method A: HTML Tag (Recommended & Pre-Wired)
1. In the Google Search Console verification modal, select **HTML tag** under *Other verification methods*.
2. Google will display a meta tag formatted like:
   ```html
   <meta name="google-site-verification" content="YOUR_TOKEN_HERE" />
   ```
3. Copy only the string inside `content="..."` (`YOUR_TOKEN_HERE`).
4. Set `GOOGLE_SITE_VERIFICATION=YOUR_TOKEN_HERE` in your environment variables or platform settings.
5. In Google Search Console, click **Verify**. Google will immediately read the rendered meta tag and confirm ownership.

#### Method B: DNS TXT Record
If you manage your own custom domain registrar (e.g. Cloudflare, Namecheap, Google Domains):
1. In Google Search Console, choose **Domain** property or DNS TXT verification.
2. Add the `TXT` record with the provided `google-site-verification` value to your DNS root `@`.
3. Wait for DNS propagation, then click **Verify**.

---

### Step 2.3: Submit XML Sitemap

Smart AI dynamically generates an XML sitemap complying with the official Sitemaps Protocol 0.9.

1. In the left navigation of Google Search Console, select **Sitemaps** (under *Indexing*).
2. Under **Add a new sitemap**, type:
   ```text
   sitemap.xml
   ```
3. Click **Submit**.
4. The status will initially read *Submitted* or *Success*. Google will discover all 14 canonical tool routes:
   - `/` (Home)
   - `/image-background-remover` (AI Background Remover)
   - `/screenshot-ai` (Multimodal Screenshot Analyzer)
   - `/scam-checker` (AI Scam & Fraud Checker)
   - `/file-tools` (File Utilities Hub)
   - `/jpg-to-pdf` (JPG to PDF Document Converter)
   - `/pdf-to-jpg` (PDF to Image Extractor)
   - `/jpg-to-word` (JPG OCR to Word DOCX Converter)
   - `/png-to-word` (PNG OCR to Word DOCX Converter)
   - `/pdf-to-word` (PDF Text & Layout to Word DOCX)
   - `/pricing` (Pricing & Free Quotas)
   - `/about` (About Smart AI)
   - `/privacy` (Privacy Policy)
   - `/terms` (Terms of Service)

---

## 3. Immediate URL Inspection & Indexing Request

To accelerate Google's indexing of high-priority pages:

1. In the top search bar in Google Search Console, paste your homepage URL (e.g. `https://smartai.tools/`) and press **Enter**.
2. Wait for GSC to fetch the data from the Google Index.
3. Click **Request Indexing**. Google will add the URL to a priority crawl queue.
4. Repeat for your highest-traffic conversion pages:
   - `https://smartai.tools/image-background-remover`
   - `https://smartai.tools/screenshot-ai`
   - `https://smartai.tools/jpg-to-pdf`
   - `https://smartai.tools/scam-checker`

---

## 4. Verifying Crawlability & Indexing Rules

### Robots.txt Verification
Inspect `/robots.txt` directly in your browser:
- `Allow: /` ensures all public utility pages are crawlable.
- `Disallow: /api/`, `Disallow: /auth/`, `Disallow: /private/`, and `Disallow: /processing/` protect user data endpoints and private sessions from search crawlers.
- `Sitemap: https://<domain>/sitemap.xml` guides Googlebot automatically.

### Server-Side Rendering & No-Script Accessibility
All 14 pages use Smart AI's SEO engine (`server/seoEngine.ts`):
- `<title>`, `<meta name="description">`, OpenGraph, and Twitter Card tags are injected directly into the HTML response before transmission.
- Clean JSON-LD structured data (`WebApplication`, `FAQPage`, `BreadcrumbList`) is injected into the `<head>` of every route.
- A semantic HTML fallback (`<noscript>` & `<article>`) provides search engine bots that do not execute JavaScript with the complete tool description, supported formats, limitations, step-by-step how-to instructions, and FAQs.

### 404 Status Code Integrity
Non-existent or typo routes return a true **HTTP 404 Not Found** status code accompanied by a helpful, user-friendly HTML error page with links back to the primary tools. This prevents "soft 404" errors in Google Search Console.

---

## 5. Built-in Technical SEO Diagnostics API

Smart AI provides a technical diagnostics endpoint that evaluates actual runtime indexing readiness:

```bash
# Test local or deployed instance
curl -s http://localhost:3000/api/seo/diagnostics | jq .summary
```

The output returns:
- `summary.status`: `PASS`, `WARNING`, or `FAIL`
- `domainConfig`: Active base URL and verification status
- `systemChecks`: Robots.txt, sitemap, passport photo decommission, and domain hygiene
- `routeAudits`: Individual health check across all 14 routes
