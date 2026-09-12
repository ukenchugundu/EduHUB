const { spawn, execSync } = require("child_process");
const fs = require("fs");
const net = require("net");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FRONTEND_ROOT = path.resolve(ROOT, "frontend");
const FRONTEND_DIST_ROOT = path.resolve(FRONTEND_ROOT, "dist");
const FRONTEND_INDEX = path.resolve(FRONTEND_DIST_ROOT, "index.html");

const FRONTEND_BUILD_INPUTS = [
  path.resolve(FRONTEND_ROOT, "src"),
  path.resolve(FRONTEND_ROOT, "public"),
  path.resolve(FRONTEND_ROOT, "index.html"),
  path.resolve(FRONTEND_ROOT, "package.json"),
  path.resolve(FRONTEND_ROOT, "postcss.config.js"),
  path.resolve(FRONTEND_ROOT, "tailwind.config.ts"),
  path.resolve(FRONTEND_ROOT, "tsconfig.app.json"),
  path.resolve(FRONTEND_ROOT, "tsconfig.json"),
  path.resolve(FRONTEND_ROOT, "tsconfig.node.json"),
  path.resolve(FRONTEND_ROOT, "vite.config.ts"),
];

const resolveNpmRunner = () => {
  const rawNpmCmd = process.env.npm_execpath;
  if (rawNpmCmd) {
    const isNodeScript = rawNpmCmd.toLowerCase().endsWith(".js");
    return {
      command: isNodeScript ? process.execPath : rawNpmCmd,
      baseArgs: isNodeScript ? [rawNpmCmd] : [],
    };
  }

  if (process.platform === "win32") {
    const nodeDir =
      (process.env.ProgramFiles &&
        path.join(process.env.ProgramFiles, "nodejs")) ||
      "C:\\Program Files\\nodejs";

    return {
      command: process.env.ComSpec || "cmd.exe",
      baseArgs: ["/d", "/s", "/c"],
      envPatch: {
        PATH: `${nodeDir}${path.delimiter}${process.env.PATH || ""}`,
      },
      useCommandString: true,
    };
  }

  return {
    command: "npm",
    baseArgs: [],
  };
};

const npmRunner = resolveNpmRunner();

const buildNpmArgs = (args) => {
  if (npmRunner.useCommandString) {
    return [...npmRunner.baseArgs, `npm ${args.join(" ")}`];
  }

  return [...npmRunner.baseArgs, ...args];
};

const getLatestModifiedTime = (targetPath) => {
  if (!fs.existsSync(targetPath)) {
    return 0;
  }

  const stats = fs.statSync(targetPath);
  if (!stats.isDirectory()) {
    return stats.mtimeMs;
  }

  const entries = fs.readdirSync(targetPath);
  let latestModifiedTime = stats.mtimeMs;
  for (const entry of entries) {
    latestModifiedTime = Math.max(
      latestModifiedTime,
      getLatestModifiedTime(path.join(targetPath, entry)),
    );
  }
  return latestModifiedTime;
};

const shouldBuildFrontend = () => {
  if (!fs.existsSync(FRONTEND_INDEX)) {
    return true;
  }

  const latestSourceUpdate = FRONTEND_BUILD_INPUTS.reduce(
    (latest, currentPath) =>
      Math.max(latest, getLatestModifiedTime(currentPath)),
    0,
  );
  const latestDistUpdate = getLatestModifiedTime(FRONTEND_DIST_ROOT);

  return latestSourceUpdate > latestDistUpdate;
};

const runNpmScript = (args, options = {}) =>
  new Promise((resolve, reject) => {
    const { env: extraEnv, ...spawnOptions } = options;
    const child = spawn(npmRunner.command, buildNpmArgs(args), {
      ...spawnOptions,
      env: {
        ...process.env,
        ...(npmRunner.envPatch || {}),
        ...(extraEnv || {}),
      },
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(child);
        return;
      }
      reject(
        new Error(`Command "${args.join(" ")}" failed with exit code ${code}`),
      );
    });
    child.on("error", (error) => {
      reject(error);
    });
  });

const isPortInUse = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once("listening", () => {
      server.close(() => resolve(false));
    });
    server.listen(port);
  });

(async () => {
  const backendPort =
    Number(process.env.BACKEND_PORT || process.env.PORT) || 3000;

  if (await isPortInUse(backendPort)) {
    console.warn(`[dev] Warning: Port ${backendPort} is already in use.`);
    if (process.platform === "win32") {
      try {
        const netstatOutput = execSync(`netstat -ano | findstr :${backendPort}`, { encoding: "utf8" });
        const lines = netstatOutput.trim().split("\n");
        console.warn(`[dev] Active connection(s) on port ${backendPort}:`);
        for (const line of lines.slice(0, 3)) {
          console.warn(`[dev]   ${line.trim()}`);
        }
      } catch {}
    }
  }

  if (shouldBuildFrontend()) {
    console.log("[dev] Frontend build is missing or outdated. Building frontend...");
    await runNpmScript(["run", "build"], {
      cwd: FRONTEND_ROOT,
    });
  }

  const backend = spawn(
    npmRunner.command,
    buildNpmArgs(["run", "dev:backend"]),
    {
      cwd: ROOT,
      env: {
        ...process.env,
        ...(npmRunner.envPatch || {}),
        PORT: String(backendPort),
      },
      stdio: "inherit",
    },
  );

  backend.on("error", (error) => {
    console.error("[dev] Failed to start backend process:", error);
    process.exit(1);
  });

  const shutdown = () => {
    if (backend && backend.pid) {
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /pid ${backend.pid} /T /F`, { stdio: "ignore" });
        } catch {}
      } else {
        backend.kill("SIGTERM");
      }
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
})();

