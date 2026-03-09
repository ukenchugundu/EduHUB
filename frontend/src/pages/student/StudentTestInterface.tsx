import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  Clock,
  Play,
  Send,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RotateCcw,
  Code2,
  BookOpen,
  Terminal,
  PanelLeftClose,
  PanelLeft,
  Eye,
  Monitor,
  Shield,
  ShieldAlert,
  Lock,
} from "lucide-react";
import EduHubAIAgent from "@/components/EduHubAIAgent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  testCases: { input: string; output: string }[];
  starterCode: string;
  language: string;
}

interface Test {
  id: string;
  title: string;
  duration: number;
  questions: Question[];
  endTime: string;
  proctoring?: {
    maxViolations?: number;
    level?: string;
  };
}

interface TestResult {
  success: boolean;
  status: string;
  results: { passed: boolean; output: string; expected: string }[];
  executionTime: number;
  memoryUsed: number;
}

interface CheatEvent {
  type: string;
  timestamp: string;
  details?: string;
}

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

// Helper to get auth token
const getAuthToken = (): string | null => {
  try {
    const authData = localStorage.getItem("eduhub_auth");
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.token || null;
    }
    return null;
  } catch {
    return null;
  }
};

const StudentTestInterface = ({ testId: propTestId }: { testId?: string | number }) => {
  const { testId: paramTestId } = useParams();
  const testId = propTestId || paramTestId;
  const navigate = useNavigate();
  
  const [test, setTest] = useState<Test | null>(null);
  const [attemptId, setAttemptId] = useState<string | number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [timeLeft, setTimeLeft] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [submissions, setSubmissions] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [activeTab, setActiveTab] = useState<"description" | "results">("description");
  const [isLoading, setIsLoading] = useState(true);
  
  // Anti-cheat states
  const [showLockScreen, setShowLockScreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [cheatEvents, setCheatEvents] = useState<CheatEvent[]>([]);
  const [violationCount, setViolationCount] = useState(0);
  const [maxViolations, setMaxViolations] = useState(3);
  const [testTerminated, setTestTerminated] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const lockOverlayRef = useRef<HTMLDivElement>(null);

  // Fetch test on mount
  useEffect(() => {
    fetchTest();
  }, [testId]);

  // Timer countdown
  useEffect(() => {
    if (!testStarted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testStarted, timeLeft]);

  // Force fullscreen on test start
  useEffect(() => {
    if (testStarted && containerRef.current) {
      // Try to enter fullscreen immediately
      setTimeout(() => {
        if (containerRef.current?.requestFullscreen) {
          containerRef.current.requestFullscreen().catch(() => {});
        }
      }, 100);
    }
  }, [testStarted]);

  // Comprehensive Anti-Cheat System
  useEffect(() => {
    if (!testStarted) return;

    // 1. Fullscreen change detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !showLockScreen) {
        logCheatEvent("fullscreen_exit", "User exited fullscreen mode");
        triggerLockScreen("Fullscreen mode was exited!");
      }
    };

    // 2. Visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logCheatEvent("tab_switch", "User switched to another tab");
        toast.warning("⚠️ Tab switch detected! This has been logged.");
        
        // Show warning overlay
        setShowLockScreen(true);
        setTimeout(() => {
          setShowLockScreen(false);
        }, 3000);
      }
    };

    // 3. Window blur (clicking outside)
    const handleWindowBlur = () => {
      logCheatEvent("window_blur", "Window lost focus");
      toast.warning("⚠️ Window focus lost!");
    };

    // 4. Keyboard shortcuts detection
    const handleKeyDown = (e: KeyboardEvent) => {
      const forbiddenKeys = [
        { key: "F12", desc: "Developer Tools" },
        { key: "F5", desc: "Refresh" },
        { key: "Escape", desc: "Exit Fullscreen" },
      ];
      
      for (const { key, desc } of forbiddenKeys) {
        if (e.key === key || (e.ctrlKey && e.key === "r")) {
          e.preventDefault();
          logCheatEvent("forbidden_key", `Attempted to use ${desc}`);
          toast.error(`🚫 ${desc} is disabled during the test!`);
          break;
        }
      }

      // Ctrl+Shift+I, Ctrl+U, Ctrl+S
      if ((e.ctrlKey && e.shiftKey && e.key === "I") ||
          (e.ctrlKey && e.key === "u") ||
          (e.ctrlKey && e.key === "s")) {
        e.preventDefault();
        logCheatEvent("keyboard_shortcut", "Attempted forbidden keyboard shortcut");
        toast.error("🚫 This keyboard shortcut is disabled!");
      }
    };

    // 5. Right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logCheatEvent("right_click", "Right-click attempted");
      toast.warning("🚫 Right-click is disabled during the test!");
    };

    // 6. Copy/Paste detection
    const handleCopy = () => {
      // Allow copy only for code (not solution)
      logCheatEvent("copy_attempt", "User attempted to copy");
    };
    
    const handlePaste = () => {
      logCheatEvent("paste_attempt", "User attempted to paste");
    };

    // 7. Screen recording detection
    // Check periodically for screen recording
    const screenRecordingInterval = setInterval(() => {
      // Check if any video element is capturing screen
      const videoElements = document.querySelectorAll("video");
      videoElements.forEach((video) => {
        if (video.srcObject && (video.srcObject as MediaStream).getTracks) {
          const tracks = (video.srcObject as MediaStream).getTracks();
          tracks.forEach((track) => {
            if (track.kind === "video") {
              logCheatEvent("screen_recording", "Screen recording detected");
              toast.error("📹 Screen recording detected!");
            }
          });
        }
      });
    }, 2000);

    // Add all event listeners
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("window.blur", handleWindowBlur);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    // Cleanup
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("window.blur", handleWindowBlur);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      clearInterval(screenRecordingInterval);
    };
  }, [testStarted, showLockScreen]);

  // Block exit attempts
  useEffect(() => {
    if (!testStarted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      logCheatEvent("exit_attempt", "User attempted to close/refresh the page");
    };

    const handlePopState = () => {
      logCheatEvent("navigation_attempt", "User attempted to navigate away");
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [testStarted]);

  const logCheatEvent = async (type: string, details?: string) => {
    const event: CheatEvent = {
      type,
      timestamp: new Date().toISOString(),
      details,
    };
    
    setCheatEvents((prev) => [...prev, event]);

    // Only count actual violations, not normal actions like code submission
    const violationTypes = [
      "fullscreen_exit",
      "tab_switch", 
      "window_blur",
      "forbidden_key",
      "keyboard_shortcut",
      "right_click",
      "copy_attempt",
      "paste_attempt",
      "screen_recording",
      "exit_attempt",
      "navigation_attempt"
    ];
    
    // Only increment violation count for actual cheating attempts, not normal submissions
    const isViolation = violationTypes.includes(type);
    
    if (isViolation) {
      const newViolationCount = violationCount + 1;
      setViolationCount(newViolationCount);

      // Get auth token from localStorage
      const token = getAuthToken();

      // Send to backend
      try {
        await fetch("/api/tests/log-cheating", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            attemptId: attemptId || testId,
            type,
            data: { details },
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.warn("Failed to log cheat event:", error);
      }

      // Show warnings until the configured violation limit is reached
      if (newViolationCount < maxViolations - 1) {
        setWarningMessage(`⚠️ WARNING ${newViolationCount}/${maxViolations}: This incident has been logged!`);
        setShowWarning(true);
        toast.warning(`⚠️ WARNING ${newViolationCount}/${maxViolations}: Violation detected! Don't do this again.`);
        setTimeout(() => setShowWarning(false), 5000);
      } else if (newViolationCount === maxViolations - 1) {
        setWarningMessage(`⚠️ FINAL WARNING ${newViolationCount}/${maxViolations}: One more violation and test ends!`);
        setShowWarning(true);
        toast.error(`⚠️ FINAL WARNING ${newViolationCount}/${maxViolations}: One more violation and test ends!`);
        setTimeout(() => setShowWarning(false), 5000);
      } 
      // Violation limit reached: terminate test
      else if (newViolationCount >= maxViolations) {
        setTestTerminated(true);
        toast.error("🚨 TEST TERMINATED: Too many violations!");
        setTimeout(() => {
          handleSubmitTest();
        }, 3000);
      }
    }
  };

  const triggerLockScreen = (reason: string) => {
    setShowLockScreen(true);
    
    // Try to re-enter fullscreen
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {});
    }

    // Log the violation
    logCheatEvent("fullscreen_exit", reason);
  };

  const fetchTest = async () => {
    setIsLoading(true);
    
    // Get auth token from localStorage
    const token = getAuthToken();
    const authHeaders: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    };
    
    try {
      const response = await fetch(`${API_BASE}/api/tests/${testId}`, {
        headers: authHeaders,
      });

      if (response.ok) {
        const data = await response.json();
        setTest(data);
        setTimeLeft(data.duration_minutes * 60 || data.duration * 60);
        if (data.questions?.length > 0) {
          setLanguage(data.questions[0].language || "python");
        }
        // Set max violations from test settings
        if (data.proctoring?.maxViolations) {
          setMaxViolations(data.proctoring.maxViolations);
        }
      } else {
        throw new Error("API not available");
      }
    } catch (error) {
      // Fallback to mock data
      const mockTest: Test = {
        id: testId != null ? String(testId) : "1",
        title: "Data Structures & Algorithms Assessment",
        duration: 90,
        endTime: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
        questions: [
          {
            id: "q1",
            title: "Two Sum",
            description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
            difficulty: "Easy",
            testCases: [
              { input: "nums = [2,7,11,15], target = 9", output: "[0,1]" },
              { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
              { input: "nums = [3,3], target = 6", output: "[0,1]" },
            ],
            starterCode: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Write your code here
        pass`,
            language: "python",
          },
          {
            id: "q2",
            title: "Valid Parentheses",
            description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
            difficulty: "Easy",
            testCases: [
              { input: 's = "()"', output: "true" },
              { input: 's = "()[]{}"', output: "true" },
              { input: 's = "(]"', output: "false" },
            ],
            starterCode: `class Solution:
    def isValid(self, s: str) -> bool:
        # Write your code here
        pass`,
            language: "python",
          },
          {
            id: "q3",
            title: "Merge Two Sorted Lists",
            description: `You are given the heads of two sorted linked lists \`list1\` and \`list2\`.

Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.

Return the head of the merged linked list.`,
            difficulty: "Easy",
            testCases: [
              { input: "list1 = [1,2,4], list2 = [1,3,4]", output: "[1,1,2,3,4,4]" },
              { input: "list1 = [], list2 = []", output: "[]" },
            ],
            starterCode: `# Definition for singly-linked list
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        # Write your code here
        pass`,
            language: "python",
          },
        ],
      };
      setTest(mockTest);
      setTimeLeft(90 * 60);
      if (mockTest.questions?.length > 0) {
        setLanguage(mockTest.questions[0].language || "python");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTest = async () => {
    // Get auth token from localStorage
    const token = getAuthToken();
    const authHeaders: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    };

    try {
      const response = await fetch(`${API_BASE}/api/tests/${testId}/start`, {
        method: "POST",
        headers: authHeaders,
      });

      if (response.ok) {
        const data = await response.json();
        setAttemptId(data.attempt.id);
        setTestStarted(true);
        if (test?.questions[0]) {
          setCode(test.questions[0].starterCode);
        }
      } else {
        // API returned error - use demo mode
        console.warn("API returned error, using demo mode");
        setAttemptId("demo_" + Date.now());
        setTestStarted(true);
        if (test?.questions[0]) {
          setCode(test.questions[0].starterCode);
        }
      }
    } catch (error) {
      console.warn("Using demo mode for start test:", error);
      setAttemptId("demo_" + Date.now());
      setTestStarted(true);
      if (test?.questions[0]) {
        setCode(test.questions[0].starterCode);
      }
    }
    
    // Request fullscreen
    try {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      }
    } catch (error) {
      console.warn("Could not enter fullscreen:", error);
    }
  };

  const handleRunCode = async () => {
    if (!test) return;
    setIsRunning(true);
    setActiveTab("results");

    const question = test.questions[currentQuestion];

    // Get auth token from localStorage
    const token = getAuthToken();
    const authHeaders: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    };

    try {
      const response = await fetch("/api/tests/run-code", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          code,
          language: question.language,
          questionId: question.id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const formattedResult: TestResult = {
          success: result.status === "Accepted",
          status: result.status,
          results: result.totalTestCases > 0
            ? Array.from({ length: result.totalTestCases }, (_, i) => ({
                passed: i < result.testCasesPassed,
                output: result.output || "",
                expected: result.expectedOutput || "",
              }))
            : [],
          executionTime: result.executionTime || 0,
          memoryUsed: result.memoryUsed || 0,
        };
        setTestResults((prev) => ({ ...prev, [question.id]: formattedResult }));

        if (result.status === "Accepted") {
          toast.success("✅ All test cases passed!");
        } else if (result.status === "Wrong Answer") {
          toast.error("❌ Wrong Answer - Some test cases failed");
        } else if (result.status === "Time Limit") {
          toast.error("⏱️ Time Limit Exceeded");
        } else if (result.status === "Runtime Error") {
          toast.error(`⚠️ Runtime Error: ${result.error}`);
        }
      } else {
        throw new Error("API not available");
      }
    } catch (error) {
      // Fallback mock result - simulate test cases
      const passedCount = Math.floor(Math.random() * question.testCases.length);
      const mockResult: TestResult = {
        success: passedCount === question.testCases.length,
        status: passedCount === question.testCases.length ? "Accepted" : "Wrong Answer",
        results: question.testCases.map((tc, i) => ({
          passed: i < passedCount,
          output: passedCount > i ? tc.output : "Wrong output",
          expected: tc.output,
        })),
        executionTime: Math.floor(Math.random() * 100) + 20,
        memoryUsed: Math.floor(Math.random() * 20) + 5,
      };
      setTestResults((prev) => ({ ...prev, [question.id]: mockResult }));
      toast.success("Code executed (Demo Mode - no backend)");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!test) return;
    const question = test.questions[currentQuestion];
    
    // Save submission locally
    setSubmissions((prev) => ({ ...prev, [question.id]: code }));
    
    logCheatEvent("code_submitted", `Question ${currentQuestion + 1} submitted`);

    // Submit to backend if attemptId is available
    if (attemptId && !attemptId.toString().startsWith("demo_")) {
      const token = getAuthToken();
      try {
        await fetch("/api/tests/submit-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            attemptId,
            questionId: question.id,
            code,
            language,
          }),
        });
      } catch (error) {
        console.warn("Failed to save submission to backend:", error);
      }
    }

    if (currentQuestion < test.questions.length - 1) {
      // Move to next question
      setCurrentQuestion((prev) => prev + 1);
      setCode(test.questions[currentQuestion + 1].starterCode);
      setTestResults((prev) => {
        const newResults = { ...prev };
        delete newResults[question.id];
        return newResults;
      });
      setActiveTab("description");
      toast.success(`📝 Question ${currentQuestion + 1} submitted! Moving to Q${currentQuestion + 2}`);
    } else {
      // All questions completed
      toast.success("🎉 All questions completed!");
    }
  };

  const handleSubmitTest = async () => {
    // Exit fullscreen
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      // Ignore fullscreen exit errors
    }

    // Get auth token from localStorage
    const token = getAuthToken();
    const authHeaders: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    };

    // Submit to backend
    try {
      const idToSubmit = attemptId || testId;
      await fetch(`${API_BASE}/api/tests/${idToSubmit}/submit`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ 
          testId, 
          submissions,
          cheatEvents 
        }),
      });
    } catch (error) {
      console.warn("Failed to submit test:", error);
    }

    toast.success("📤 Test submitted successfully!");
    navigate("/student/tests");
  };

  const handleResetCode = () => {
    if (!test) return;
    setCode(test.questions[currentQuestion].starterCode);
    toast.info("🔄 Code reset to starter template");
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "Medium": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Hard": return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#0d1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-zinc-400 font-medium">Loading assessment...</p>
        </div>
      </div>
    );
  }

  // Pre-test instructions screen
  if (!testStarted && test) {
    return (
      <div className="h-screen w-screen bg-[#0d1117] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
              <Code2 className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{test.title}</h1>
            <p className="text-zinc-400">Read the instructions carefully before starting</p>
          </div>

          <div className="bg-[#161b22] rounded-xl border border-zinc-800 p-6 mb-6 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Anti-Cheat Monitoring
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <Monitor className="w-4 h-4" /> Fullscreen Mode
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Eye className="w-4 h-4" /> Tab Switching Log
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <ShieldAlert className="w-4 h-4" /> Screen Recording Detect
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Lock className="w-4 h-4" /> Right-click Disabled
              </div>
            </div>
          </div>

          <div className="bg-[#161b22] rounded-xl border border-zinc-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Instructions
            </h2>
            <ul className="space-y-3 text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                This test contains <span className="text-white font-medium">{test.questions.length} coding problems</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                You have <span className="text-white font-medium">{test.duration} minutes</span> to complete
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                The test runs in <span className="text-white font-medium">fullscreen mode</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500">•</span>
                <span className="text-red-400 font-medium">{maxViolations} violations</span> will auto-terminate the test
              </li>
            </ul>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/student/tests")}
              className="flex-1 h-12 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              Back to Tests
            </Button>
            <Button
              onClick={handleStartTest}
              className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Start Assessment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!test) return null;

  const question = test.questions[currentQuestion];
  const result = testResults[question.id];

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen bg-[#0d1117] text-zinc-300 flex flex-col overflow-hidden relative"
    >
      {/* Warning Popup - Shows on violations */}
      {showWarning && (
        <div className="fixed inset-0 z-[9998] bg-black/80 flex items-center justify-center">
          <div className="bg-yellow-500 border-4 border-yellow-600 rounded-2xl p-8 max-w-lg text-center shadow-2xl">
            <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-12 h-12 text-yellow-900" />
            </div>
            <h2 className="text-2xl font-bold text-yellow-900 mb-2">
              {violationCount >= maxViolations - 1 ? "🚨 FINAL WARNING" : "⚠️ WARNING"}
            </h2>
            <p className="text-yellow-800 text-lg mb-4">{warningMessage}</p>
            <p className="text-yellow-700 font-medium">
              Violations: {violationCount} / {maxViolations}
            </p>
            {violationCount < maxViolations && (
              <p className="text-yellow-900 mt-4 text-sm font-bold">
                Next violation will TERMINATE your test!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Lock Screen Overlay - Full Screen Lock Mode (on test termination) */}
      {showLockScreen && (
        <div 
          ref={lockOverlayRef}
          className="fixed inset-0 z-[9999] bg-red-600 flex items-center justify-center"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="text-center p-12 max-w-2xl">
            <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-8 animate-pulse">
              <ShieldAlert className="w-20 h-20 text-white" />
            </div>
            <h2 className="text-5xl font-bold text-white mb-4">🚨 VIOLATION DETECTED!</h2>
            <p className="text-2xl text-white/90 mb-6">Return to the test immediately!</p>
            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <p className="text-white/80 text-lg">This incident has been logged and will be reported.</p>
            </div>
            <div className="text-3xl font-bold text-white/60">
              Violations: <span className="text-yellow-300">{violationCount}</span> / {maxViolations}
            </div>
            <p className="mt-8 text-white/50 text-sm">
              Any further violations will result in automatic test termination.
            </p>
          </div>
        </div>
      )}

      {/* Test Terminated Screen */}
      {testTerminated && (
        <div className="fixed inset-0 z-[9999] bg-red-700 flex items-center justify-center">
          <div className="text-center p-12 max-w-2xl">
            <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-8">
              <XCircle className="w-20 h-20 text-white" />
            </div>
            <h2 className="text-5xl font-bold text-white mb-4">🚫 TEST TERMINATED</h2>
            <p className="text-2xl text-white/90 mb-6">Due to multiple violations</p>
            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <p className="text-white/80 text-lg">Your test has been automatically submitted.</p>
              <p className="text-white/60 mt-2">All violations have been recorded.</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="h-14 md:h-12 bg-[#161b22] border-b border-zinc-800 flex items-center justify-between px-2 md:px-4 shrink-0 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button
            onClick={() => {
              if (window.confirm("Are you sure? Your test will be submitted?")) {
                handleSubmitTest();
              }
            }}
            className="flex items-center gap-1 md:gap-2 text-zinc-400 hover:text-white transition-colors p-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs md:text-sm font-medium">Exit</span>
          </button>

          <Separator orientation="vertical" className="h-5 bg-zinc-700 hidden sm:block" />

          <h1 className="text-xs md:text-sm font-medium text-white truncate max-w-[80px] sm:max-w-none">{test.title}</h1>

          <Separator orientation="vertical" className="h-5 bg-zinc-700 hidden sm:block" />

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800"
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion((q) => q - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <div className="px-1.5 md:px-2 py-1 rounded bg-zinc-800 text-[10px] md:text-xs font-medium shrink-0">
              <span className="text-zinc-500 hidden sm:inline">Q</span>
              <span className="text-white sm:ml-1">{currentQuestion + 1}</span>
              <span className="text-zinc-500">/{test.questions.length}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800"
              disabled={currentQuestion === test.questions.length - 1}
              onClick={() => setCurrentQuestion((q) => q + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {/* Violation Counter */}
          <div className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 rounded-lg ${
            violationCount > 0 ? "bg-red-500/10 border border-red-500/20" : "bg-zinc-800"
          }`}>
            <ShieldAlert className={`w-3.5 h-3.5 md:w-4 md:h-4 ${violationCount > 0 ? "text-red-500" : "text-zinc-400"}`} />
            <span className={`text-[10px] md:text-xs font-medium ${violationCount > 0 ? "text-red-500" : "text-zinc-400"}`}>
              {violationCount} <span className="hidden sm:inline">violations</span>
            </span>
          </div>

          <div className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg ${
            timeLeft < 300 ? "bg-red-500/10 border border-red-500/20" : "bg-zinc-800"
          }`}>
            <Clock className={`w-3.5 h-3.5 md:w-4 md:h-4 ${timeLeft < 300 ? "text-red-500" : "text-zinc-400"}`} />
            <span className={`font-mono font-semibold text-xs md:text-sm ${timeLeft < 300 ? "text-red-500" : "text-white"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          
          <Button
            onClick={handleSubmitTest}
            className="h-8 px-2 md:px-4 bg-green-600 hover:bg-green-700 text-white text-[10px] md:text-sm font-medium rounded-md shrink-0"
          >
            Submit
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Question Navigation */}
        <div className={`${showSidebar ? 'w-full lg:w-72' : 'w-0 lg:w-10'} flex-shrink-0 border-r border-zinc-800 flex flex-col transition-all duration-200 lg:h-full ${!showSidebar && 'overflow-hidden lg:overflow-visible'}`}>
          <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-3 shrink-0">
            {(showSidebar || window.innerWidth >= 1024) && (
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Questions</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-500 hover:text-white"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </Button>
          </div>

          {showSidebar && (
            <ScrollArea className="flex-1 p-2 max-h-[30vh] lg:max-h-none">
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-1 gap-1">
                {test.questions.map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentQuestion(index);
                      setCode(q.starterCode);
                      setTestResults((prev) => {
                        const newResults = { ...prev };
                        delete newResults[q.id];
                        return newResults;
                      });
                      if (window.innerWidth < 1024) setShowSidebar(false);
                    }}
                    className={`p-2 rounded-lg flex items-center gap-2 transition-all ${
                      currentQuestion === index
                        ? "bg-blue-600/20 border border-blue-600/40"
                        : submissions[q.id]
                        ? "bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20"
                        : "hover:bg-zinc-800 border border-transparent"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-semibold shrink-0 ${
                      currentQuestion === index
                        ? "bg-blue-600 text-white"
                        : submissions[q.id]
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-700 text-zinc-300"
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 text-left min-w-0 hidden lg:block">
                      <p className="text-xs font-medium text-zinc-300 truncate">{q.title}</p>
                    </div>
                    {submissions[q.id] && (
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 hidden lg:block" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Problem Description Panel */}
        <div className="w-full lg:w-[40%] border-r border-zinc-800 flex flex-col lg:h-full max-h-[40vh] lg:max-h-none shrink-0 lg:shrink">
          <div className="h-10 border-b border-zinc-800 flex items-center px-4 gap-4 shrink-0">
            <button
              onClick={() => setActiveTab("description")}
              className={`h-10 px-3 text-xs md:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "description"
                  ? "text-white border-blue-500"
                  : "text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Description
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`h-10 px-3 text-xs md:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "results"
                  ? "text-white border-blue-500"
                  : "text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              <Terminal className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Results
              {result && (
                <span className={`ml-1 md:ml-2 px-1 py-0.5 rounded text-[10px] ${
                  result.success ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {result.status}
                </span>
              )}
            </button>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            {activeTab === "description" ? (
              <div className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3 mb-4">
                  <h2 className="text-lg md:text-xl font-bold text-white truncate">{question.title}</h2>
                  <Badge className={`${getDifficultyColor(question.difficulty)} text-[10px] px-1.5 py-0`}>
                    {question.difficulty}
                  </Badge>
                </div>

                <div className="prose prose-invert max-w-none mb-6">
                  <div className="whitespace-pre-wrap text-zinc-300 text-xs md:text-sm leading-relaxed">
                    {question.description}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs md:text-sm font-semibold text-white">Examples</h3>
                  {question.testCases.map((tc, i) => (
                    <div key={i} className="bg-[#161b22] rounded-lg border border-zinc-800 overflow-hidden">
                      <div className="px-3 md:px-4 py-1.5 md:py-2 bg-zinc-800/50 text-[10px] md:text-xs font-semibold text-zinc-400 uppercase">
                        Example {i + 1}
                      </div>
                      <div className="p-3 md:p-4 space-y-2 text-xs md:text-sm font-mono">
                        <div className="overflow-x-auto">
                          <span className="text-zinc-500 whitespace-nowrap">Input: </span>
                          <span className="text-zinc-300">{tc.input}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <span className="text-zinc-500 whitespace-nowrap">Output: </span>
                          <span className="text-emerald-400 font-semibold">{tc.output}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-[#161b22] rounded-lg border border-zinc-800">
                  <h3 className="text-sm font-semibold text-white mb-2">Constraints</h3>
                  <ul className="text-sm text-zinc-400 space-y-1 font-mono">
                    <li>• 1 ≤ length of array ≤ 10⁴</li>
                    <li>• -10⁹ ≤ element ≤ 10⁹</li>
                    <li>• Only one valid answer exists</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-4">
                {!result && !isRunning && (
                  <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                    <Terminal className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm">Click "Run" to execute your code</p>
                    <p className="text-xs mt-2">Results will appear here</p>
                  </div>
                )}

                {isRunning && (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                    <p className="text-sm text-zinc-400">Running your code...</p>
                    <p className="text-xs text-zinc-500 mt-2">Checking test cases</p>
                  </div>
                )}

                {result && !isRunning && (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg border ${
                      result.success
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-red-500/10 border-red-500/20"
                    }`}>
                      <div className="flex items-center gap-3">
                        {result.success ? (
                          <CheckCircle className="w-6 h-6 text-emerald-500" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-500" />
                        )}
                        <div>
                          <div className={`font-semibold ${
                            result.success ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {result.status}
                          </div>
                          <div className="text-xs text-zinc-500">
                            Runtime: {result.executionTime}ms • Memory: {result.memoryUsed}MB
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-white mb-3">Test Cases</h3>
                      <div className="space-y-2">
                        {result.results.map((res, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-lg border ${
                              res.passed
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : "bg-red-500/5 border-red-500/20"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-zinc-500">Test Case {i + 1}</span>
                              {res.passed ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">✓ Passed</Badge>
                              ) : (
                                <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">✗ Failed</Badge>
                              )}
                            </div>
                            <div className="text-xs font-mono space-y-1">
                              <div className="flex gap-2">
                                <span className="text-zinc-500">Your Output:</span>
                                <span className={res.passed ? "text-emerald-400" : "text-red-400"}>
                                  {res.output || "(empty)"}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-zinc-500">Expected:</span>
                                <span className="text-zinc-300">{res.expected || "(empty)"}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="flex-1 flex flex-col min-w-0 min-h-[40vh] lg:min-h-0 border-t lg:border-t-0 border-zinc-800">
          <div className="h-12 md:h-10 bg-[#161b22] border-b border-zinc-800 flex items-center justify-between px-2 md:px-4 shrink-0 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded px-1.5 md:px-2 py-1 text-[10px] md:text-xs text-white font-medium focus:outline-none focus:border-blue-500 shrink-0"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetCode}
                className="h-7 px-1.5 md:px-2 text-[10px] md:text-xs text-zinc-400 hover:text-white shrink-0"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>

            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              <Button
                onClick={handleRunCode}
                disabled={isRunning}
                variant="secondary"
                className="h-7 px-2 md:px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] md:text-xs font-medium"
              >
                {isRunning ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Play className="w-3 h-3 mr-1" />
                )}
                Run
              </Button>
              <Button
                onClick={handleSubmitCode}
                className="h-7 px-2 md:px-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] md:text-xs font-medium"
              >
                <Send className="w-3 h-3 mr-1" />
                {currentQuestion < test.questions.length - 1 ? "Submit & Next" : "Submit Question"}
              </Button>
            </div>
          </div>

          <div className="flex-1 bg-[#1e1e1e] relative min-h-[300px] lg:min-h-0">
            <Editor
              height="100%"
              language={language}
              value={code}
              theme="vs-dark"
              onChange={(value) => setCode(value || "")}
              options={{
                minimap: { enabled: false },
                fontSize: window.innerWidth < 768 ? 12 : 14,
                fontFamily: "'Fira Code', 'Consolas', monospace",
                lineNumbers: "on",
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                cursorBlinking: "smooth",
                renderLineHighlight: "all",
                bracketPairColorization: { enabled: true },
                wordWrap: "on",
              }}
            />
          </div>
        </div>
      </main>
      <EduHubAIAgent role="student" disabled defaultOpen />
    </div>
  );
};

export default StudentTestInterface;

