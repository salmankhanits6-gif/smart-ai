import React, { useState, useEffect } from "react";
import { UserProfile, UsageData, ActivityLog } from "../types";
import {
  loginUserApi,
  registerUserApi,
  logoutUserApi,
  fetchUserHistory,
} from "../lib/api";
import {
  X,
  User as UserIcon,
  LogIn,
  UserPlus,
  LogOut,
  Clock,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  usage: UsageData | null;
  onAuthChange: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  user,
  usage,
  onAuthChange,
}) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ActivityLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setLoadingHistory(true);
      fetchUserHistory()
        .then((logs) => setHistory(logs))
        .catch(() => setHistory([]))
        .finally(() => setLoadingHistory(false));
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await loginUserApi(email, password);
      } else {
        await registerUserApi(email, password, name);
      }
      onAuthChange();
      setEmail("");
      setPassword("");
      setName("");
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUserApi();
    onAuthChange();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {user ? (
          /* User Profile View */
          <div className="space-y-6">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{user.name}</h3>
                <p className="text-xs text-slate-500">{user.email}</p>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Authenticated Member
                </div>
              </div>
            </div>

            {/* Daily Usage Quota */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Today's Quota (Enhanced Tier)
                </span>
                <span className="text-slate-500">Resets daily</span>
              </div>
              {usage && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="block text-base font-bold text-slate-900">
                      {usage.remaining.screenshotAi}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Screenshots
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="block text-base font-bold text-slate-900">
                      {usage.remaining.scamChecker}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Scam Checks
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="block text-base font-bold text-slate-900">
                      {usage.remaining.fileTools}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      File Ops
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Activity History */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Recent Usage History
                </h4>
                <span className="text-[11px] text-slate-400">Past 50 actions</span>
              </div>

              {loadingHistory ? (
                <div className="text-xs text-slate-400 py-4 text-center">Loading activity...</div>
              ) : history.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  No actions logged yet today. Use Screenshot AI, File Tools, or Scam Checker!
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 block">{item.action}</span>
                        <span className="text-[11px] text-slate-500 line-clamp-1">{item.details}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Logout button */}
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-sm transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* Login / Register Form */
          <div className="space-y-5">
            <div>
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3">
                <UserIcon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {mode === "login" ? "Sign in to Smart AI" : "Create your Smart AI Account"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {mode === "login"
                  ? "Access higher daily limits, saved history, and enhanced features."
                  : "Enjoy increased daily analysis limits across all AI utility tools."}
              </p>
            </div>

            {/* Toggle mode */}
            <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  mode === "login"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  mode === "register"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span>Processing...</span>
                  ) : mode === "login" ? (
                    <>
                      <LogIn className="w-4 h-4" /> Sign In
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" /> Create Free Account
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <Shield className="w-3.5 h-3.5 text-blue-600" /> Optional Account Note
              </div>
              <p>
                An account is completely optional for standard usage. You can use Smart AI anonymously anytime within daily free limits.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
