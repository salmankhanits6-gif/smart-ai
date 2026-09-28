export interface UsageLimits {
  screenshotAi: number;
  scamChecker: number;
  fileTools: number;
}

export const APP_LIMITS: {
  anonymous: UsageLimits;
  authenticated: UsageLimits;
  maxUploadSizeMb: number;
} = {
  anonymous: {
    screenshotAi: 5,
    scamChecker: 10,
    fileTools: 20,
  },
  authenticated: {
    screenshotAi: 25,
    scamChecker: 50,
    fileTools: 100,
  },
  maxUploadSizeMb: 15,
};

export const PRO_FEATURES = [
  "Unlimited Screenshot AI analyses",
  "Higher file size limits (up to 100MB)",
  "Priority queue processing & zero throttling",
  "Batch file conversion & OCR export (CSV/JSON)",
  "Enhanced threat-intelligence database scans",
  "Extended 90-day history with cloud export",
];
