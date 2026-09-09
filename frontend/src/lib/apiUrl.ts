const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

export const normalizeApiBase = (value: string | undefined | null): string => {
  const rawValue = String(value ?? "").trim();
  if (!rawValue || rawValue === "/") {
    return "";
  }

  if (ABSOLUTE_URL_PATTERN.test(rawValue)) {
    try {
      return new URL(rawValue).origin;
    } catch {
      return rawValue.replace(/\/+$/, "");
    }
  }

  const normalizedValue = rawValue.replace(/\/+$/, "");
  if (
    !normalizedValue ||
    normalizedValue === "/api" ||
    normalizedValue.startsWith("/api/")
  ) {
    return "";
  }

  return normalizedValue;
};

export const DEFAULT_API_BASE = "https://eduhub-backend-pf6o.onrender.com";

export const getApiBase = (): string => {
  const envUrl = normalizeApiBase(import.meta.env.VITE_API_URL);
  if (envUrl) {
    return envUrl;
  }

  // If running in a deployed environment (e.g. Vercel), fall back to live Render backend
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return DEFAULT_API_BASE;
  }

  return "";
};

export const API_BASE = getApiBase();

export const buildApiUrl = (path: string): string => {
  const trimmedPath = path.trim();
  if (!trimmedPath || ABSOLUTE_URL_PATTERN.test(trimmedPath)) {
    return trimmedPath;
  }

  const normalizedPath = trimmedPath.startsWith("/")
    ? trimmedPath
    : `/${trimmedPath}`;

  return `${API_BASE}${normalizedPath}`;
};

export const resolveApiUrl = (url: string): string => {
  const trimmedUrl = url.trim();
  if (
    !trimmedUrl ||
    ABSOLUTE_URL_PATTERN.test(trimmedUrl) ||
    (!trimmedUrl.startsWith("/api") && !trimmedUrl.startsWith("/uploads"))
  ) {
    return trimmedUrl;
  }

  return buildApiUrl(trimmedUrl);
};
