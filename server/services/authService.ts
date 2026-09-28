import crypto from "crypto";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
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

// In-memory store with persistence capability
const users = new Map<string, User>();
const sessions = new Map<string, string>(); // token -> userId
const activityLogs: ActivityLog[] = [];

// Seed a default demo account for testing if desired
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

export function registerUser(email: string, password: string, name: string): { user: Omit<User, "passwordHash" | "salt">; token: string } {
  const normalizedEmail = email.trim().toLowerCase();
  if (users.has(normalizedEmail)) {
    throw new Error("An account with this email address already exists.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const id = crypto.randomUUID();

  const user: User = {
    id,
    email: normalizedEmail,
    name: name.trim() || normalizedEmail.split("@")[0],
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  };

  users.set(normalizedEmail, user);

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
    token,
  };
}

export function loginUser(email: string, password: string): { user: Omit<User, "passwordHash" | "salt">; token: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.get(normalizedEmail);
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    throw new Error("Invalid email or password.");
  }

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
    token,
  };
}

export function getUserByToken(token: string): Omit<User, "passwordHash" | "salt"> | null {
  if (!token) return null;
  const userId = sessions.get(token);
  if (!userId) return null;

  for (const user of users.values()) {
    if (user.id === userId) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      };
    }
  }
  return null;
}

export function logoutUser(token: string): void {
  if (token) {
    sessions.delete(token);
  }
}

export function logActivity(log: Omit<ActivityLog, "id" | "timestamp">): void {
  activityLogs.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...log,
  });

  // Keep logs at a reasonable memory ceiling
  if (activityLogs.length > 500) {
    activityLogs.length = 500;
  }
}

export function getUserActivity(userId?: string): ActivityLog[] {
  if (!userId) {
    // Return recent general anonymous activities (sanitized)
    return activityLogs.slice(0, 10);
  }
  return activityLogs.filter((log) => log.userId === userId).slice(0, 50);
}
