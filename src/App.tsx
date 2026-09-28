import React, { useState, useEffect } from "react";
import { ViewType, ScreenshotMode, UserProfile, UsageData } from "./types";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { AccountModal } from "./components/AccountModal";
import { HomeView } from "./views/HomeView";
import { ScreenshotAiView } from "./views/ScreenshotAiView";
import { FileToolsView } from "./views/FileToolsView";
import { ScamCheckerView } from "./views/ScamCheckerView";
import { PricingView } from "./views/PricingView";
import { AboutView } from "./views/AboutView";
import { PrivacyTermsView } from "./views/PrivacyTermsView";
import { BackgroundRemoverView } from "./views/BackgroundRemoverView";
import { fetchCurrentUser, fetchUsage } from "./lib/api";
import { getViewForPath, getPathForView, updateClientSeo } from "./lib/seo";

export default function App() {
  const initialRoute = typeof window !== "undefined"
    ? getViewForPath(window.location.pathname)
    : { view: "home" as ViewType, subtool: undefined, matched: true };

  const [currentView, setCurrentView] = useState<ViewType>(initialRoute.view);
  const [screenshotMode, setScreenshotMode] = useState<ScreenshotMode>("explain");
  const [scamTab, setScamTab] = useState<"message" | "url">("message");
  const [selectedFileTool, setSelectedFileTool] = useState<string | undefined>(
    initialRoute.subtool || "jpg-to-pdf"
  );
  const [user, setUser] = useState<UserProfile | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  // Load user and usage limits
  const refreshData = async () => {
    try {
      const [u, usg] = await Promise.all([fetchCurrentUser(), fetchUsage()]);
      setUser(u);
      setUsage(usg);
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    refreshData();

    // Listen to browser forward/back buttons
    const handlePopState = () => {
      const route = getViewForPath(window.location.pathname);
      setCurrentView(route.view);
      if (route.subtool) {
        setSelectedFileTool(route.subtool);
      }
      updateClientSeo(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    // Initialize SEO meta tags for current page
    updateClientSeo(window.location.pathname);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigate = (
    view: ViewType,
    options?: { mode?: ScreenshotMode; scamTab?: "message" | "url"; fileTool?: string }
  ) => {
    setCurrentView(view);
    if (options?.mode) {
      setScreenshotMode(options.mode);
    }
    if (options?.scamTab) {
      setScamTab(options.scamTab);
    }
    if (options?.fileTool) {
      setSelectedFileTool(options.fileTool);
    }

    const effectiveSubtool = options?.fileTool || (view === "file-tools" ? selectedFileTool : undefined);
    const targetPath = getPathForView(view, effectiveSubtool);

    if (typeof window !== "undefined" && window.location.pathname !== targetPath) {
      window.history.pushState({}, "", targetPath);
      updateClientSeo(targetPath);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      {/* Sticky Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(v) => handleNavigate(v)}
        user={user}
        usage={usage}
        onOpenAccount={() => setAccountModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === "home" && (
          <HomeView onNavigate={handleNavigate} />
        )}

        {currentView === "screenshot-ai" && (
          <ScreenshotAiView
            initialMode={screenshotMode}
            onQuotaUpdate={refreshData}
          />
        )}

        {currentView === "file-tools" && (
          <FileToolsView
            initialTool={selectedFileTool}
            onQuotaUpdate={refreshData}
          />
        )}

        {currentView === "background-remover" && (
          <BackgroundRemoverView onQuotaUpdate={refreshData} />
        )}

        {currentView === "scam-checker" && (
          <ScamCheckerView
            initialTab={scamTab}
            onQuotaUpdate={refreshData}
          />
        )}

        {currentView === "pricing" && (
          <PricingView
            onNavigate={(v) => handleNavigate(v)}
            onOpenAccount={() => setAccountModalOpen(true)}
          />
        )}

        {currentView === "about" && (
          <AboutView onNavigate={(v) => handleNavigate(v)} />
        )}

        {currentView === "privacy" && (
          <PrivacyTermsView initialTab="privacy" />
        )}

        {currentView === "terms" && (
          <PrivacyTermsView initialTab="terms" />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={(v) => handleNavigate(v)} />

      {/* Account & History Modal */}
      <AccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        user={user}
        usage={usage}
        onAuthChange={() => {
          refreshData();
        }}
      />
    </div>
  );
}
