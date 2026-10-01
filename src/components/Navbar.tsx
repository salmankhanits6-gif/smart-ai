import React, { useState } from "react";
import { ViewType, UserProfile, UsageData } from "../types";
import {
  Sparkles,
  Camera,
  FileBox,
  ShieldCheck,
  User as UserIcon,
  Menu,
  X,
  Zap,
  Layers,
} from "lucide-react";

interface NavbarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  user: UserProfile | null;
  usage: UsageData | null;
  onOpenAccount: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  user,
  usage,
  onOpenAccount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: ViewType; label: string; href: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Home", href: "/", icon: <Sparkles className="w-4 h-4" /> },
    { id: "background-remover", label: "Background Remover", href: "/image-background-remover", icon: <Layers className="w-4 h-4" /> },
    { id: "screenshot-ai", label: "Screenshot AI", href: "/screenshot-ai", icon: <Camera className="w-4 h-4" /> },
    { id: "file-tools", label: "File Tools", href: "/file-tools", icon: <FileBox className="w-4 h-4" /> },
    { id: "scam-checker", label: "Scam Checker", href: "/scam-checker", icon: <ShieldCheck className="w-4 h-4" /> },
    { id: "pricing", label: "Pricing", href: "/pricing", icon: <Zap className="w-4 h-4" /> },
  ];

  const handleNavClick = (view: ViewType) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  const totalRemaining = usage
    ? usage.remaining.screenshotAi + usage.remaining.scamChecker + usage.remaining.fileTools
    : null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <a
            href="/"
            id="brand-logo-btn"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("home");
            }}
            className="flex items-center gap-3 cursor-pointer group select-none text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm group-hover:bg-blue-600 transition-colors">
              <Sparkles className="w-5 h-5 text-blue-400 group-hover:text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Smart AI
              </span>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Understand. Convert. Stay Safe.
              </p>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = currentView === item.id;
              return (
                <a
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.id);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Right Action: Usage & Account */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Authenticated user daily allowance indicator */}
            {user && totalRemaining !== null && (
              <div
                title="Remaining operations today for your account"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>
                  Allowance:{" "}
                  <strong className="text-slate-900 font-semibold">
                    {totalRemaining}
                  </strong>{" "}
                  left today
                </span>
              </div>
            )}

            <button
              id="account-btn"
              onClick={onOpenAccount}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-sm font-semibold shadow-2xs transition-all active:scale-98"
            >
              <UserIcon className="w-4 h-4 text-slate-500" />
              <span>{user ? user.name : "Account"}</span>
              {user && (
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              )}
            </button>
          </div>

          {/* Mobile Menu Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              id="mobile-account-btn"
              onClick={onOpenAccount}
              className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label="Account"
            >
              <UserIcon className="w-5 h-5" />
            </button>
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navItems.map((item) => {
            const active = currentView === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.id);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            );
          })}

          {user && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="truncate max-w-[180px]">
                Signed in as {user.name || user.email}
              </span>
              {totalRemaining !== null && (
                <span className="font-semibold text-slate-800">
                  {totalRemaining} ops left today
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
