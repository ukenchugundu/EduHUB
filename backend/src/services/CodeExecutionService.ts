import { exec } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

interface ExecutionResult {
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

interface TestCase {
  input: string;
  expected_output?: string;
  expectedOutput?: string;
  output?: string;
}

export class CodeExecutionService {
  private readonly TEMP_DIR = "/tmp/code_execution";
  private readonly TIME_LIMIT = 30000; // 30 seconds

  constructor() {
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.TEMP_DIR, { recursive: true });
    } catch (error) {
      console.error("Failed to create temp directory:", error);
    }
  }

  async executeCode(
    code: string,
    language: string,
    testCases: TestCase[],
    timeLimit: number = 30,
    _memoryLimit: number = 256,
  ): Promise<ExecutionResult> {
    const sessionId = uuidv4();
    const workDir = path.join(this.TEMP_DIR, sessionId);

    try {
      await fs.mkdir(workDir, { recursive: true });

      let result: ExecutionResult;

      switch (language.toLowerCase()) {
        case "python":
          result = await this.executePython(
            code,
            testCases,
            workDir,
            timeLimit,
          );
          break;
        case "javascript":
          result = await this.executeJavaScript(
            code,
            testCases,
            workDir,
            timeLimit,
          );
          break;
        case "java":
          result = await this.executeJava(code, testCases, workDir, timeLimit);
          break;
        case "cpp":
        case "c++":
          result = await this.executeCpp(code, testCases, workDir, timeLimit);
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      return result;
    } finally {
      // Cleanup
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch (error) {
        console.error("Cleanup failed:", error);
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
    await fs.writeFile(filePath, code);

    let testCasesPassed = 0;
    const startTime = Date.now();

    for (const testCase of testCases) {
      try {
        const result = await this.runCommand(
          `echo "${testCase.input}" | timeout ${timeLimit}s python3 ${filePath}`,
          workDir,
        );

        const expectedOutput = testCase.expectedOutput || testCase.expected_output || "";
        if (result.stdout.trim() === expectedOutput.trim()) {
          testCasesPassed++;
        } else {
          return {
            status: "Wrong Answer",
            output: result.stdout,
            expectedOutput: expectedOutput,
            executionTime: Date.now() - startTime,
            memoryUsed: 0,
            testCasesPassed,
            totalTestCases: testCases.length,
          };
        }
      } catch (error) {
        return {
          status:
            error instanceof Error && error.message.includes("timeout")
              ? "Time Limit"
              : "Runtime Error",
          error: error instanceof Error ? error.message : "Unknown error",
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
    await fs.writeFile(filePath, code);

    let testCasesPassed = 0;
    const startTime = Date.now();

    for (const testCase of testCases) {
      try {
        const result = await this.runCommand(
          `echo "${testCase.input}" | timeout ${timeLimit}s node ${filePath}`,
          workDir,
        );

        const expectedOutput = testCase.expectedOutput || testCase.expected_output || "";
        if (result.stdout.trim() === expectedOutput.trim()) {
          testCasesPassed++;
        } else {
          return {
            status: "Wrong Answer",
            output: result.stdout,
            expectedOutput: expectedOutput,
            executionTime: Date.now() - startTime,
            memoryUsed: 0,
            testCasesPassed,
            totalTestCases: testCases.length,
          };
        }
      } catch (error) {
        return {
          status:
            error instanceof Error && error.message.includes("timeout")
              ? "Time Limit"
              : "Runtime Error",
          error: error instanceof Error ? error.message : "Unknown error",
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
    _code: string,
    _testCases: TestCase[],
    _workDir: string,
    _timeLimit: number,
  ): Promise<ExecutionResult> {
    throw new Error("Java execution not implemented yet");
  }

  private async executeCpp(
    _code: string,
    _testCases: TestCase[],
    _workDir: string,
    _timeLimit: number,
  ): Promise<ExecutionResult> {
    throw new Error("C++ execution not implemented yet");
  }

  private runCommand(
    command: string,
    cwd: string,
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      exec(
        command,
        { cwd, timeout: this.TIME_LIMIT },
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve({ stdout, stderr });
          }
        },
      );
    });
  }
}
