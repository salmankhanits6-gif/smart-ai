# Smart AI — Free Public Cloudflare Deployment Guide

This guide describes how to deploy **Smart AI** to **Cloudflare Pages** on Cloudflare's free plan without requiring Google AI Studio's "Publish your app" paid billing setup.

---

## 1. Architecture Overview

Smart AI uses a hybrid, production-ready architecture optimized for Cloudflare's free tier:

```
                                  [ User / Browser ]
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │    Cloudflare Edge Network (Free)     │
                      │                                       │
                      │  1. Static Assets (dist/)             │
                      │     - React 19 / Vite SPA Frontend    │
                      │     - CSS / JS assets                 │
                      │     - Robots.txt & Sitemap.xml        │
                      │     - Google Search Verification      │
                      │                                       │
                      │  2. Cloudflare Pages Functions        │
                      │     - /api/health                     │
                      │     - /api/usage                      │
                      │     - /api/auth/* (HMAC Tokens)       │
                      │     - /api/screenshot/analyze (Gemini)│
                      │     - /api/scam/check-message (Gemini)│
                      │     - /api/scam/check-url (Heuristics)│
                      │     - /api/files/jpg-to-pdf (pdf-lib) │
                      │     - /api/files/merge-pdf (pdf-lib)  │
                      │     - /api/files/split-pdf (pdf-lib)  │
                      │     - Dynamic SEO HTMLRewriter        │
                      └───────────────────┬───────────────────┘
                                          │
                  Optional Proxy via BACKEND_SERVICE_URL
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │      Companion Backend Container      │
                      │     (Render / Fly.io / Cloud Run)     │
                      │                                       │
                      │  Native C++ / ONNX Binary Endpoints:  │
                      │  - Background Removal (@imgly ONNX)   │
                      │  - PDF to JPG (@napi-rs/canvas)       │
                      │  - Word (.docx) OCR (Tesseract)       │
                      │  - Image Conversions (libvips sharp)  │
                      └───────────────────────────────────────┘
```

---

## 2. Cloudflare Pages Dashboard Settings & Deploy Commands

When deploying to Cloudflare Pages:

| Setting | Value |
|---|---|
| **Project Name** | `smart-ai` |
| **Framework Preset** | `None` or `Vite` |
| **Build Command** | `npm run build` |
| **Deploy Command (CLI / CI)** | `npx wrangler pages deploy dist --project-name smart-ai` (or `npm run deploy`) |
| **Build Output Directory** | `dist` |
| **Root Directory** | `/` |

> **IMPORTANT**: Never use `npx wrangler deploy` on this project. `wrangler deploy` is designed for standalone Cloudflare Workers and will fail with `"Missing entry-point to Worker script or to assets directory"`. This project is a Cloudflare Pages full-stack application with edge Functions (`/functions`), and must be deployed using `npx wrangler pages deploy dist --project-name smart-ai`.

---

## 3. Required Environment Variables

Configure these in the Cloudflare Pages dashboard under:  
**Settings** $\rightarrow$ **Environment variables** $\rightarrow$ **Production**:

| Variable Name | Required? | Description / Example |
|---|---|---|
| `GEMINI_API_KEY` | **Required** | Your Google Gemini API Key from Google AI Studio. Stored as a secure secret. |
| `PUBLIC_SITE_URL` | **Required** | The live URL of your deployment (e.g. `https://smart-ai.pages.dev` or `https://yourdomain.com`). Used for canonical SEO tags, OpenGraph URLs, and sitemap. |
| `PACKAGE_MANAGER` | **Recommended** | Set to `npm` to ensure Cloudflare Pages uses npm install/ci instead of detecting Bun. |
| `NPM_VERSION` | Optional | Set to `10.9.8` to specify the npm version for Cloudflare Pages. |
| `GOOGLE_API_KEY` | Optional | Alias for `GEMINI_API_KEY`. |
| `AUTH_SECRET` | Optional | A random secure string used to sign user session tokens. Defaults to `GEMINI_API_KEY` if omitted. |
| `BACKEND_SERVICE_URL` | Optional | URL of your companion backend container (e.g. `https://smart-ai-backend.onrender.com`). When provided, native binary operations (background removal, Word OCR) are seamlessly reverse-proxied. |

---

## 4. Cloudflare Runtime Compatibility

Configured in `wrangler.json`:
- `compatibility_date`: `"2025-02-01"`
- `compatibility_flags`: `["nodejs_compat"]`
- `pages_build_output_dir`: `"dist"`

---

## 5. Public Static Verification Files

The following critical files are automatically bundled into `dist/` and served directly:
- `google0fdc91d48d434718.html` (Google Search Console ownership verification)
- `_headers` (Security headers: nosniff, SAMEORIGIN, strict-origin-when-cross-origin)
- `_routes.json` (Pages routing table)
- `robots.txt` & `sitemap.xml` (SEO index directives)

---

## 6. Local Testing with Wrangler CLI

To test your Cloudflare Pages build locally using Wrangler:

```bash
npm run build
npx wrangler pages dev dist
```
