import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export interface ExecutionResult {
  status:
    | "Accepted"
    | "Wrong Answer"
    | "Time Limit"
    | "Runtime Error"
    | "Compile Error";
  output?: string;
  expectedOutput?: string;
  error?: string;
  executionTime: number;
  memoryUsed: number;
  testCasesPassed: number;
  totalTestCases: number;
}

export interface TestCase {
  input: string;
  expected_output?: string;
  expectedOutput?: string;
  output?: string;
}

interface SpawnResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
  exitCode: number | null;
}

export class CodeExecutionService {
  private readonly TEMP_DIR: string;
  private readonly isWindows = process.platform === "win32";

  constructor() {
    this.TEMP_DIR = path.join(os.tmpdir(), "eduhub_code_execution");
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.TEMP_DIR, { recursive: true });
    } catch (error) {
      console.error("Failed to initialize temp code execution directory:", error);
    }
  }

  /**
   * Sanitizes the environment variables to prevent student code from leaking database credentials or tokens.
   */
  private getSanitizedEnv(): NodeJS.ProcessEnv {
    return {
      PATH: process.env.PATH || "",
      SYSTEMROOT: process.env.SYSTEMROOT || "",
      TEMP: process.env.TEMP || os.tmpdir(),
      TMP: process.env.TMP || os.tmpdir(),
      NODE_ENV: "production",
    };
  }

  /**
   * Spawns a process with piped stdin, strict execution timeout, and sanitized env.
   */
  private runProcess(
    command: string,
    args: string[],
    cwd: string,
    input: string = "",
    timeoutSeconds: number = 10,
  ): Promise<SpawnResult> {
    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const child = spawn(command, args, {
        cwd,
        env: this.getSanitizedEnv(),
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill("SIGKILL");
        } catch {
          // ignore
        }
      }, timeoutSeconds * 1000);

      if (input) {
        try {
          child.stdin.write(input);
          child.stdin.end();
        } catch {
          // ignore write errors
        }
      } else {
        child.stdin.end();
      }

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: stderr || err.message,
          timedOut,
          exitCode: -1,
        });
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          timedOut,
          exitCode: code,
        });
      });
    });
  }

  async executeCode(
    code: string,
    language: string,
    testCases: TestCase[],
    timeLimit: number = 10,
    memoryLimit: number = 256,
  ): Promise<ExecutionResult> {
    const sessionId = uuidv4();
    const workDir = path.join(this.TEMP_DIR, sessionId);

    try {
      await fs.mkdir(workDir, { recursive: true });

      const lang = language.toLowerCase();
      switch (lang) {
        case "python":
        case "py":
          return await this.executePython(code, testCases, workDir, timeLimit);

        case "javascript":
        case "js":
        case "node":
          return await this.executeJavaScript(code, testCases, workDir, timeLimit);

        case "cpp":
        case "c++":
        case "c":
          return await this.executeCpp(code, testCases, workDir, timeLimit);

        case "java":
          return await this.executeJava(code, testCases, workDir, timeLimit);

        default:
          throw new Error(`Unsupported programming language: ${language}`);
      }
    } finally {
      // Safe cleanup
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch (error) {
        console.warn("[CodeExecution] Temp directory cleanup failed:", error);
      }
    }
  }

  private async executePython(
    code: string,
    testCases: TestCase[],
    workDir: string,
    timeLimit: number,
  ): Promise<ExecutionResult> {
    const filePath = path.join(workDir, "solution.py");
    await fs.writeFile(filePath, code, "utf8");

    const pythonCmd = this.isWindows ? "python" : "python3";
    let testCasesPassed = 0;
    const startTime = Date.now();

    for (const testCase of testCases) {
      const input = testCase.input ?? "";
      const expectedOutput = (testCase.expectedOutput || testCase.expected_output || "").trim();

      const result = await this.runProcess(
        pythonCmd,
        ["solution.py"],
        workDir,
        input,
        timeLimit,
      );

      if (result.timedOut) {
        return {
          status: "Time Limit",
          error: `Time limit exceeded (${timeLimit}s)`,
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          testCasesPassed,
          totalTestCases: testCases.length,
        };
      }

      if (result.exitCode !== 0) {
        return {
          status: "Runtime Error",
          error: result.stderr || "Process exited with error",
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          testCasesPassed,
          totalTestCases: testCases.length,
        };
      }

      const actualOutput = result.stdout.trim();
      if (actualOutput === expectedOutput) {
        testCasesPassed++;
      } else {
        return {
          status: "Wrong Answer",
          output: actualOutput,
          expectedOutput,
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          testCasesPassed,
          totalTestCases: testCases.length,
        };
      }
    }

    return {
      status: "Accepted",
      executionTime: Date.now() - startTime,
      memoryUsed: 0,
      testCasesPassed,
      totalTestCases: testCases.length,
    };
  }

  private async executeJavaScript(
    code: string,
    testCases: TestCase[],
    workDir: string,
    timeLimit: number,
  ): Promise<ExecutionResult> {
    const filePath = path.join(workDir, "solution.js");
    await fs.writeFile(filePath, code, "utf8");

    let testCasesPassed = 0;
    const startTime = Date.now();

    for (const testCase of testCases) {
      const input = testCase.input ?? "";
      const expectedOutput = (testCase.expectedOutput || testCase.expected_output || "").trim();

      const result = await this.runProcess(
        "node",
        ["--max-old-space-size=256", "solution.js"],
        workDir,
        input,
        timeLimit,
      );

      if (result.timedOut) {
        return {
          status: "Time Limit",
          error: `Time limit exceeded (${timeLimit}s)`,
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          testCasesPassed,
          totalTestCases: testCases.length,
        };
      }

      if (result.exitCode !== 0) {
        return {
          status: "Runtime Error",
          error: result.stderr || "Runtime error occurred",
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          testCasesPassed,
          totalTestCases: testCases.length,
        };
      }

      const actualOutput = result.stdout.trim();
      if (actualOutput === expectedOutput) {
        testCasesPassed++;
      } else {
        return {
          status: "Wrong Answer",
          output: actualOutput,
          expectedOutput,
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          testCasesPassed,
          totalTestCases: testCases.length,
        };
      }
    }

    return {
      status: "Accepted",
      executionTime: Date.now() - startTime,
      memoryUsed: 0,
      testCasesPassed,
      totalTestCases: testCases.length,
    };
  }

  private async executeCpp(
    code: string,
    testCases: TestCase[],
    workDir: string,
    timeLimit: number,
  ): Promise<ExecutionResult> {
    const sourcePath = path.join(workDir, "solution.cpp");
    const executableName = this.isWindows ? "solution.exe" : "solution";
    const executablePath = path.join(workDir, executableName);

    await fs.writeFile(sourcePath, code, "utf8");

    // 1. Compile
    const compileResult = await this.runProcess(
      "g++",
      ["-O2", "-std=c++17", "solution.cpp", "-o", executableName],
      workDir,
      "",
      15,
    );

    if (compileResult.exitCode !== 0) {
      return {
        status: "Compile Error",
        error: compileResult.stderr || "Compilation failed. Check C++ syntax.",
        executionTime: 0,
        memoryUsed: 0,
        testCasesPassed: 0,
        totalTestCases: testCases.length,
      };
    }

    // 2. Execute test cases
    let testCasesPassed = 0;
    const startTime = Date.now();

    for (const testCase of testCases) {
      const input = testCase.input ?? "";
      const expectedOutput = (testCase.expectedOutput || testCase.expected_output || "").trim();

      const result = await this.runProcess(
        executablePath,
        [],
        workDir,
        input,
        timeLimit,
      );

      if (result.timedOut) {
        return {
          status: "Time Limit",
          error: `Execution time limit exceeded (${timeLimit}s)`,
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          testCasesPassed,
          totalTestCases: testCases.length,
        };
      }

      if (result.exitCode !== 0) {
        return {
          status: "Runtime Error",
          error: result.stderr || "Runtime error (e.g. segmentation fault or uncaught exception)",
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          testCasesPassed,
          totalTestCases: testCases.length,
        };
      }

      const actualOutput = result.stdout.trim();
      if (actualOutput === expectedOutput) {
        testCasesPassed++;
      } else {
        return {
          status: "Wrong Answer",
          output: actualOutput,
          expectedOutput,
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          testCasesPassed,
          totalTestCases: testCases.length,
        };
      }
    }

    return {
      status: "Accepted",
      executionTime: Date.now() - startTime,
      memoryUsed: 0,
      testCasesPassed,
      totalTestCases: testCases.length,
    };
  }

  private async executeJava(
    code: string,
    testCases: TestCase[],
    workDir: string,
    timeLimit: number,
  ): Promise<ExecutionResult> {
    // If class name is not Solution, ensure it has a class Solution or adapt
    let adjustedCode = code;
    if (!code.includes("class Solution") && code.includes("class Main")) {
      adjustedCode = code.replace(/public\s+class\s+Main/, "public class Solution");
    }

    const sourcePath = path.join(workDir, "Solution.java");
    await fs.writeFile(sourcePath, adjustedCode, "utf8");

    // 1. Compile
    const compileResult = await this.runProcess(
      "javac",
      ["Solution.java"],
      workDir,
      "",
      15,
    );

    if (compileResult.exitCode !== 0) {
      return {
        status: "Compile Error",
        error: compileResult.stderr || "Java compilation failed. Ensure class is named 'Solution'.",
        executionTime: 0,
        memoryUsed: 0,
        testCasesPassed: 0,
        totalTestCases: testCases.length,
      };
    }

    // 2. Execute test cases
    let testCasesPassed = 0;
    const startTime = Date.now();

    for (const testCase of testCases) {
      const input = testCase.input ?? "";
      const expectedOutput = (testCase.expectedOutput || testCase.expected_output || "").trim();

      const result = await this.runProcess(
        "java",
        ["-Xmx256m", "-Duser.language=en", "Solution"],
        workDir,
        input,
        timeLimit,
      );

      if (result.timedOut) {
        return {
          status: "Time Limit",
          error: `Execution time limit exceeded (${timeLimit}s)`,
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          testCasesPassed,
          totalTestCases: testCases.length,
        };
      }

      if (result.exitCode !== 0) {
        return {
          status: "Runtime Error",
          error: result.stderr || "Java runtime exception occurred",
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          testCasesPassed,
          totalTestCases: testCases.length,
        };
      }

      const actualOutput = result.stdout.trim();
      if (actualOutput === expectedOutput) {
        testCasesPassed++;
      } else {
        return {
          status: "Wrong Answer",
          output: actualOutput,
          expectedOutput,
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
          testCasesPassed,
          totalTestCases: testCases.length,
        };
      }
    }

    return {
      status: "Accepted",
      executionTime: Date.now() - startTime,
      memoryUsed: 0,
      testCasesPassed,
      totalTestCases: testCases.length,
    };
  }
}

export default CodeExecutionService;
