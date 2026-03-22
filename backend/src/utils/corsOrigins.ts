const normalizeOrigin = (value: string | undefined): string => {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return "";
  }

  try {
    return new URL(rawValue).origin;
  } catch {
    return rawValue.replace(/\/+$/, "");
    }
  };

const TRUSTED_DEPLOYMENT_SUFFIXES = [".vercel.app", ".onrender.com"];

export const buildAllowedOrigins = (
  frontendBaseUrl: string | undefined,
  corsAllowedOriginsRaw: string | undefined,
): string[] => {
  const configuredCorsOrigins = (corsAllowedOriginsRaw || "")
    .split(",")
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  return Array.from(
    new Set(
      [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082",
        normalizeOrigin(frontendBaseUrl),
        ...configuredCorsOrigins,
      ].filter(Boolean),
    ),
  );
};

export const isAllowedOrigin = (
  origin: string,
  allowedOrigins: string[],
): boolean => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  return (
    allowedOrigins.includes(normalizedOrigin) ||
    TRUSTED_DEPLOYMENT_SUFFIXES.some((suffix) =>
      normalizedOrigin.endsWith(suffix),
    )
  );
};
