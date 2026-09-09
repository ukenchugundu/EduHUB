const { CodeExecutionService } = require("../dist/services/CodeExecutionService");

describe("CodeExecutionService", () => {
  let service;

  beforeAll(() => {
    service = new CodeExecutionService();
  });

  test("should execute Python code and verify accepted test cases", async () => {
    try {
      const code = `
import sys
data = sys.stdin.read().split()
if len(data) >= 2:
    print(int(data[0]) + int(data[1]))
`;
      const testCases = [
        { input: "3 5", expectedOutput: "8" },
        { input: "10 20", expectedOutput: "30" },
      ];

      const result = await service.executeCode(code, "python", testCases, 5);
      if (result.status === "Runtime Error" && String(result.error || "").toLowerCase().includes("enoent")) {
        console.warn("Python executable not available on this runner; skipping.");
        return;
      }
      expect(result.status).toBe("Accepted");
      expect(result.testCasesPassed).toBe(2);
    } catch (err) {
      if (String(err?.message || "").toLowerCase().includes("enoent")) {
        console.warn("Python not installed; skipping test.");
        return;
      }
      throw err;
    }
  });

  test("should execute JavaScript code and verify accepted test cases", async () => {
    const code = `
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length >= 2) {
  console.log(Number(input[0]) * Number(input[1]));
}
`;
    const testCases = [
      { input: "4 5", expectedOutput: "20" },
      { input: "7 8", expectedOutput: "56" },
    ];

    const result = await service.executeCode(code, "javascript", testCases, 5);
    expect(result.status).toBe("Accepted");
    expect(result.testCasesPassed).toBe(2);
  });

  test("should prevent student code from leaking sensitive environment variables", async () => {
    try {
      const code = `
import os
print("DATABASE_URL:" + str(os.environ.get("DATABASE_URL", "NOT_FOUND")))
`;
      const testCases = [
        { input: "", expectedOutput: "DATABASE_URL:NOT_FOUND" },
      ];

      const result = await service.executeCode(code, "python", testCases, 5);
      if (result.status === "Runtime Error" && String(result.error || "").toLowerCase().includes("enoent")) {
        console.warn("Python executable not available on this runner; skipping.");
        return;
      }
      expect(result.status).toBe("Accepted");
    } catch (err) {
      if (String(err?.message || "").toLowerCase().includes("enoent")) {
        console.warn("Python not installed; skipping test.");
        return;
      }
      throw err;
    }
  });
});
