export type ViewType =
  | "home"
  | "screenshot-ai"
  | "file-tools"
  | "background-remover"
  | "scam-checker"
  | "pricing"
  | "about"
  | "privacy"
  | "terms";

export type ScreenshotMode = "explain" | "error" | "form" | "ocr" | "reply";

export interface FormFieldInfo {
  fieldName: string;
  fieldPurpose: string;
  expectedDataType: string;
  isRequired: boolean;
  notes: string;
}

export interface SuggestedReplies {
  professional: string;
  friendly: string;
  short: string;
  polite: string;
}

export interface ScreenshotAnalysisResult {
  mode: ScreenshotMode;
  aiSummary: string;
  detectedContent: {
    contentType: string;
    visualContext: string;
    identifiedElements: string[];
  };
  explanation: string;
  recommendedAction: string;
  stepByStepSolution?: string[];
  preventionTips?: string[];
  extractedText?: string;
  formFields?: FormFieldInfo[];
  suggestedReplies?: SuggestedReplies;
  confidenceAssessment: {
    level: "HIGH" | "MEDIUM" | "LOW";
    notes: string;
    confirmedFacts: string[];
    aiHypotheses: string[];
  };
}

export interface UrlSignalCheck {
  id: string;
  name: string;
  status: "pass" | "warn" | "fail" | "info";
  description: string;
}

export interface UrlSecurityResult {
  url: string;
  normalizedUrl: string;
  domain: string;
  riskScore: number;
  riskLevel: "LOW RISK" | "SUSPICIOUS" | "HIGH RISK";
  riskLabel: string;
  summary: string;
  warningSigns: string[];
  safetyRecommendations: string[];
  technicalSignals: UrlSignalCheck[];
  redirectChain?: string[];
  threatDatabaseStatus: string;
  neutralityStatement: string;
}

export interface ScamMessageResult {
  inputType: "message" | "email" | "sms" | "social";
  riskScore: number;
  riskLevel: "LOW RISK" | "SUSPICIOUS" | "HIGH RISK";
  riskLabel: string;
  summary: string;
  warningSigns: string[];
  safetyRecommendations: string[];
  impersonationTarget?: string;
  psychologicalTriggers: string[];
  neutralityStatement: string;
}

export interface UsageData {
  limits: {
    screenshotAi: number;
    scamChecker: number;
    fileTools: number;
  };
  used: {
    screenshotAi: number;
    scamChecker: number;
    fileTools: number;
  };
  remaining: {
    screenshotAi: number;
    scamChecker: number;
    fileTools: number;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  feature: "screenshot_ai" | "file_tools" | "scam_checker";
  action: string;
  details: string;
  timestamp: string;
}

export interface BackgroundRemovalResponse {
  success: boolean;
  jobId?: string;
  base64: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  originalSize: number;
  outputSize: number;
  hasAlpha: boolean;
  format: "png" | "webp";
  resolutionMode: "original" | "hd" | "4k";
  edgeMode?: "standard" | "crisp" | "soft";
}

export interface BackgroundReplaceResponse {
  success: boolean;
  jobId?: string;
  base64: string;
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha?: boolean;
}

