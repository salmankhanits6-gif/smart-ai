import { SEO_PAGES, SeoPageConfig } from "./seoData";
import { ViewType } from "../types";

export function getPathForView(view: ViewType, subtool?: string): string {
  if (view === "home") return "/";
  if (view === "background-remover") return "/image-background-remover";
  if (view === "file-tools") {
    if (subtool && SEO_PAGES[`/${subtool}`]) {
      return `/${subtool}`;
    }
    return "/file-tools";
  }
  if (view === "screenshot-ai") return "/screenshot-ai";
  if (view === "scam-checker") return "/scam-checker";
  if (view === "pricing") return "/pricing";
  if (view === "about") return "/about";
  if (view === "privacy") return "/privacy";
  if (view === "terms") return "/terms";
  return "/";
}

export function getViewForPath(pathname: string): {
  view: ViewType;
  subtool?: string;
  matched: boolean;
} {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  // Check alias for background-remover
  if (normalized === "/background-remover") {
    return { view: "background-remover", matched: true };
  }

  const page = SEO_PAGES[normalized];
  if (page) {
    return {
      view: page.view,
      subtool: page.subtool,
      matched: true,
    };
  }

  return { view: "home", matched: false };
}

export function updateClientSeo(path: string) {
  if (typeof document === "undefined") return;

  const normalized = path.replace(/\/+$/, "") || "/";
  const effectivePath = normalized === "/background-remover" ? "/image-background-remover" : normalized;
  const page: SeoPageConfig | undefined = SEO_PAGES[effectivePath] || SEO_PAGES["/"];

  if (!page) return;

  const baseUrl = window.location.origin;
  const canonicalUrl = `${baseUrl}${page.path}`;

  // 1. Update Title
  document.title = page.title;

  // 2. Helper to set or create meta
  const setMeta = (nameAttr: string, nameVal: string, contentVal: string) => {
    let el = document.querySelector(`meta[${nameAttr}="${nameVal}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(nameAttr, nameVal);
      document.head.appendChild(el);
    }
    el.setAttribute("content", contentVal);
  };

  // 3. Meta Description & Robots
  setMeta("name", "description", page.metaDescription);
  setMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

  // 4. OpenGraph & Twitter
  setMeta("property", "og:title", page.title);
  setMeta("property", "og:description", page.metaDescription);
  setMeta("property", "og:url", canonicalUrl);
  setMeta("property", "og:type", "website");
  setMeta("property", "og:site_name", "Smart AI");
  setMeta("property", "og:image", `${baseUrl}/og-image.png`);

  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", page.title);
  setMeta("name", "twitter:description", page.metaDescription);
  setMeta("name", "twitter:image", `${baseUrl}/og-image.png`);

  // 5. Canonical Link
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement("link");
    canonicalLink.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute("href", canonicalUrl);
}
