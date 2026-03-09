export const buildAllowedOrigins = (
  frontendBaseUrl: string | undefined,
  corsAllowedOriginsRaw: string | undefined,
): string[] => {
  const normalizedFrontendBaseUrl = (frontendBaseUrl || "")
    .trim()
    .replace(/\/$/, "");
  const configuredCorsOrigins = (corsAllowedOriginsRaw || "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);

  return Array.from(
    new Set(
      [
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8082",
        "https://eduhub-frontend.vercel.app",
        "https://ukenchugundu-project-svce.vercel.app",
        normalizedFrontendBaseUrl,
        ...configuredCorsOrigins,
      ].filter(Boolean),
    ),
  );
};