import {
  ScreenshotAnalysisResult,
  ScreenshotMode,
  ScamMessageResult,
  UrlSecurityResult,
  UsageData,
  UserProfile,
  ActivityLog,
} from "../types";

const TOKEN_KEY = "smart_ai_auth_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchUsage(): Promise<UsageData> {
  const res = await fetch("/api/usage", {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch usage limits.");
  return res.json();
}

export async function fetchCurrentUser(): Promise<UserProfile | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/auth/me", {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      setStoredToken(null);
      return null;
    }
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

export async function fetchUserHistory(): Promise<ActivityLog[]> {
  const res = await fetch("/api/auth/history", {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.logs || [];
}

export async function loginUserApi(email: string, password: string): Promise<UserProfile> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed.");
  setStoredToken(data.token);
  return data.user;
}

export async function registerUserApi(
  email: string,
  password: string,
  name: string
): Promise<UserProfile> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Registration failed.");
  setStoredToken(data.token);
  return data.user;
}

export async function logoutUserApi(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: getAuthHeaders(),
    });
  } finally {
    setStoredToken(null);
  }
}

export async function analyzeScreenshotApi(
  file: File | null,
  imageBase64: string | null,
  mode: ScreenshotMode
): Promise<ScreenshotAnalysisResult> {
  const headers = getAuthHeaders();
  let body: FormData | string;

  if (file) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("mode", mode);
    const res = await fetch("/api/screenshot/analyze", {
      method: "POST",
      headers: headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Analysis failed.");
    return data.data;
  } else if (imageBase64) {
    const res = await fetch("/api/screenshot/analyze", {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageBase64, mode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Analysis failed.");
    return data.data;
  } else {
    throw new Error("No image provided.");
  }
}

export async function checkScamMessageApi(
  text: string,
  category: string
): Promise<ScamMessageResult> {
  const res = await fetch("/api/scam/check-message", {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, category }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to check message.");
  return data.data;
}

export async function checkScamUrlApi(url: string): Promise<UrlSecurityResult> {
  const res = await fetch("/api/scam/check-url", {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to evaluate URL.");
  return data.data;
}

// ==========================================
// AI Background Remover Client APIs
// ==========================================

export async function removeBackgroundApi(
  file: File,
  options: { resolution?: string; format?: string; edgeMode?: "standard" | "crisp" | "soft" } = {}
): Promise<any> {
  const formData = new FormData();
  formData.append("image", file);
  if (options.resolution) formData.append("resolution", options.resolution);
  if (options.format) formData.append("format", options.format);
  if (options.edgeMode) formData.append("edgeMode", options.edgeMode);

  const res = await fetch("/api/background/remove", {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to remove background.");
  return data;
}

export async function replaceBackgroundApi(formData: FormData): Promise<any> {
  const res = await fetch("/api/background/replace", {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to replace background.");
  return data;
}

export async function recompositeBackgroundApi(params: {
  jobId?: string | null;
  backgroundType: "transparent" | "color" | "custom_image";
  backgroundColor?: string;
  customBackgroundFile?: File | null;
  resolution?: "original" | "hd" | "4k";
  outputFormat?: "png" | "jpg" | "webp";
  foregroundBase64?: string;
}): Promise<any> {
  if (params.customBackgroundFile) {
    const formData = new FormData();
    if (params.jobId) formData.append("jobId", params.jobId);
    formData.append("backgroundType", params.backgroundType);
    if (params.backgroundColor) formData.append("backgroundColor", params.backgroundColor);
    if (params.resolution) formData.append("resolution", params.resolution);
    if (params.outputFormat) formData.append("outputFormat", params.outputFormat);
    if (params.foregroundBase64) formData.append("foregroundBase64", params.foregroundBase64);
    formData.append("customBackground", params.customBackgroundFile);

    const res = await fetch("/api/background/recomposite", {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to composite background.");
    return data;
  }

  const res = await fetch("/api/background/recomposite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      jobId: params.jobId || undefined,
      backgroundType: params.backgroundType,
      backgroundColor: params.backgroundColor,
      resolution: params.resolution,
      outputFormat: params.outputFormat,
      foregroundBase64: params.foregroundBase64 || undefined,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to composite background.");
  return data;
}

export async function releaseBackgroundJobApi(jobId: string): Promise<void> {
  try {
    await fetch("/api/background/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
  } catch (err) {
    // Ignore cleanup errors
  }
}

export async function downloadBackgroundBinaryApi(params: {
  jobId?: string | null;
  foregroundBase64?: string;
  backgroundType: string;
  backgroundColor?: string;
  resolution?: string;
  format?: string;
}): Promise<{ blob: Blob; newJobId?: string }> {
  const res = await fetch("/api/background/download", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      jobId: params.jobId || undefined,
      foregroundBase64: params.foregroundBase64 || undefined,
      backgroundType: params.backgroundType,
      backgroundColor: params.backgroundColor,
      resolution: params.resolution,
      format: params.format,
    }),
  });

  if (!res.ok) {
    let errorMsg = "Failed to download image.";
    try {
      const errData = await res.json();
      errorMsg = errData.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const newJobId = res.headers.get("x-job-id") || undefined;
  const blob = await res.blob();
  return { blob, newJobId };
}

// ==========================================
// Helper Utilities
// ==========================================

export function downloadBase64File(base64Url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = base64Url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

