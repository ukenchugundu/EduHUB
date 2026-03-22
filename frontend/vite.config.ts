import { defineConfig, loadEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const normalizeApiBase = (value: string | undefined): string => {
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

// https://vitejs.dev/config/
export default defineConfig(({ mode }): UserConfig => {
  // Load environment variables - for production, it will load .env.production
  const env = loadEnv(
    mode === "production" ? "production" : mode,
    process.cwd(),
    "",
  );

  // For local development use: http://localhost:3000 (or override with VITE_API_PROXY_TARGET)
  // For production use: https://eduhub-backend.onrender.com
  // For ngrok use your backend ngrok URL (e.g., https://abc123.ngrok-free.app)
  const publicApiBase = normalizeApiBase(env.VITE_API_URL);
  const proxyOverride = normalizeApiBase(env.VITE_API_PROXY_TARGET);

  // Determine the API URL based on mode
  let proxyTarget: string;
  if (mode === "production") {
    proxyTarget = publicApiBase || "https://eduhub-backend.onrender.com";
  } else {
    proxyTarget = proxyOverride || publicApiBase || "http://localhost:3000";
  }

  console.log(
    `[Vite] Running in ${mode} mode, public API base: ${
      publicApiBase || "(same-origin)"
    }, proxy target: ${proxyTarget}`,
  );

  return {
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(publicApiBase),
    },
    server: {
      host: "::",
      port: 8081,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/uploads": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    optimizeDeps: {
      include: ["@tanstack/react-query", "lucide-react"],
      force: true,
    },
    plugins: [react()] as any,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
