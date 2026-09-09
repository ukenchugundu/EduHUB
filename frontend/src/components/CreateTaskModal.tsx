import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  Bell,
  Settings,
  Eye,
  Lock,
  Plus,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  FileText,
  Target,
  GraduationCap,
  Zap,
} from "lucide-react";
import { readStoredAuth } from "@/lib/authSession";
import {
  fetchFacultyClassAllocations,
  getFacultyClassOptionKey,
  type FacultyClassAllocationOption,
} from "@/lib/facultyClassAllocations";

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");

interface SubjectOption {
  id: number;
  name: string;
  code: string;
}

interface TaskFormData {
  title: string;
  type: "quiz" | "test" | "assignment";
  cls: string;
  batchId: number | null;
  subject: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  duration: number;
  instructions: string[];
  targetStudents: string[];
  priority: "low" | "medium" | "high";
  notifications: {
    enabled: boolean;
    reminderTimes: number[];
    emailNotification: boolean;
    pushNotification: boolean;
  };
  proctoring: {
    level: "basic" | "standard" | "strict";
    enableWebcam: boolean;
    enableScreenShare: boolean;
    lockdownMode: boolean;
    allowedAttempts: number;
    maxViolations: number;
  };
  grading: {
    autoGrade: boolean;
    passingScore: number;
    showResults: "immediate" | "after_deadline" | "manual";
    allowRetakes: boolean;
  };
}

const CreateTaskModal = ({
  isOpen,
  onClose,
  taskType,
}: {
  isOpen: boolean;
  onClose: () => void;
  taskType: "quiz" | "test" | "assignment" | null;
}) => {
  const navigate = useNavigate();
  // Get current date and time for defaults
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().slice(0, 5);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
    .toTimeString()
    .slice(0, 5);

  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    type: taskType || "quiz",
    cls: "",
    batchId: null,
    subject: "",
    description: "",
    startDate: today,
    startTime: currentTime,
    endDate: today,
    endTime: oneHourLater,
    duration: 60,
    instructions: [""],
    targetStudents: [],
    priority: "medium",
    notifications: {
      enabled: true,
      reminderTimes: [24, 1], // hours before
      emailNotification: true,
      pushNotification: true,
    },
    proctoring: {
      level: "standard",
      enableWebcam: false,
      enableScreenShare: false,
      lockdownMode: false,
      allowedAttempts: 1,
      maxViolations: 3,
    },
    grading: {
      autoGrade: false,
      passingScore: 60,
      showResults: "after_deadline",
      allowRetakes: false,
    },
  });

  const [currentStep, setCurrentStep] = useState(1);
  const isSecurityNeeded = taskType === "quiz" || taskType === "test";
  const totalSteps = isSecurityNeeded ? 4 : 3;
  const [facultyClasses, setFacultyClasses] = useState<
    FacultyClassAllocationOption[]
  >([]);
  const [loadingFacultyClasses, setLoadingFacultyClasses] = useState(false);
  const [facultyClassesError, setFacultyClassesError] = useState("");
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");

  useEffect(() => {
    if (isOpen && taskType) {
      setCurrentStep(1);
      setFormData({
        title: "",
        type: taskType,
        cls: "",
        batchId: null,
        subject: "",
        description: "",
        startDate: today,
        startTime: currentTime,
        endDate: today,
        endTime: oneHourLater,
        duration: 60,
        instructions: [""],
        targetStudents: [],
        priority: "medium",
        notifications: {
          enabled: true,
          reminderTimes: [24, 1],
          emailNotification: true,
          pushNotification: true,
        },
        proctoring: {
          level: "standard",
          enableWebcam: false,
          enableScreenShare: false,
          lockdownMode: false,
          allowedAttempts: 1,
          maxViolations: 3,
        },
        grading: {
          autoGrade: false,
          passingScore: 60,
          showResults: "after_deadline",
          allowRetakes: false,
        },
      });
    }
  }, [isOpen, taskType]);

  useEffect(() => {
    if (!isOpen || taskType !== "quiz") {
      return;
    }

    const session = readStoredAuth();
    if (session?.role !== "faculty" || !session.token) {
      setFacultyClasses([]);
      setFacultyClassesError("Sign in again to load your assigned classes.");
      return;
    }

    const controller = new AbortController();

    const loadFacultyClasses = async () => {
      setLoadingFacultyClasses(true);
      setFacultyClassesError("");

      try {
        const options = await fetchFacultyClassAllocations(controller.signal);

        setFacultyClasses(options);
        setFormData((prev) => {
          if (
            prev.cls.trim() &&
            options.some(
              (option) =>
                option.className === prev.cls &&
                option.batchId === (prev.batchId ?? null),
            )
          ) {
            return prev;
          }

          return {
            ...prev,
            cls: "",
            batchId: null,
          };
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setFacultyClasses([]);
        setFacultyClassesError("Unable to load assigned classes right now.");
      } finally {
        setLoadingFacultyClasses(false);
      }
    };

    void loadFacultyClasses();

    return () => controller.abort();
  }, [isOpen, taskType]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const session = readStoredAuth();
    if (!session?.token) {
      setSubjectOptions([]);
      setSubjectsError("Sign in again to load subjects.");
      return;
    }

    const controller = new AbortController();

    const loadSubjects = async () => {
      setLoadingSubjects(true);
      setSubjectsError("");

      try {
        const response = await fetch(`${API_BASE}/api/attendance/subjects`, {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
          signal: controller.signal,
        });

        if (response.ok) {
          const data = (await response.json()) as SubjectOption[];
          const options = Array.isArray(data) ? data : [];
          if (options.length > 0) {
            setSubjectOptions(options);
            return;
          }
        }

        const fallbackResponse = await fetch(`${API_BASE}/api/subjects`, {
          signal: controller.signal,
        });

        if (!fallbackResponse.ok) {
          throw new Error("Failed to load subjects.");
        }

        const fallbackData = (await fallbackResponse.json()) as SubjectOption[];
        setSubjectOptions(Array.isArray(fallbackData) ? fallbackData : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setSubjectOptions([]);
        setSubjectsError("Unable to load subjects right now.");
      } finally {
        setLoadingSubjects(false);
      }
    };

    void loadSubjects();

    return () => controller.abort();
  }, [isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...prev[parent as keyof TaskFormData], [field]: value },
    }));
  };

  const addInstruction = () => {
    setFormData((prev) => ({
      ...prev,
      instructions: [...prev.instructions, ""],
    }));
  };

  const updateInstruction = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) =>
        i === index ? value : inst,
      ),
    }));
  };

  const removeInstruction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index),
    }));
  };

  const isFormValid = () => {
    return (
      formData.title.trim() &&
      (formData.type !== "quiz" || formData.cls.trim()) &&
      formData.subject.trim() &&
      formData.description.trim()
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      alert(
        formData.type === "quiz"
          ? "Please fill in all required fields (Title, Class, Subject, Description)"
          : "Please fill in all required fields (Title, Subject, Description)",
      );
      return;
    }

    try {
      const typeToUse = formData.type;

      if (typeToUse === "quiz") {
        navigate("/faculty/create-quiz", {
          state: { taskData: formData },
        });
        onClose();
        return;
      }

      if (typeToUse === "test") {
        navigate("/faculty/create-test", {
          state: { taskData: formData },
        });
        onClose();
        return;
      }

      if (typeToUse === "assignment") {
        navigate("/faculty/create-assignment", {
          state: { taskData: formData },
        });
        onClose();
        return;
      }

      // Reset form and close modal
      setCurrentStep(1);
      setFormData({
        title: "",
        type: taskType || "quiz",
        cls: "",
        batchId: null,
        subject: "",
        description: "",
        startDate: today,
        startTime: currentTime,
        endDate: today,
        endTime: oneHourLater,
        duration: 60,
        instructions: [""],
        targetStudents: [],
        priority: "medium",
        notifications: {
          enabled: true,
          reminderTimes: [24, 1],
          emailNotification: true,
          pushNotification: true,
        },
        proctoring: {
          level: "standard",
          enableWebcam: false,
          enableScreenShare: false,
          lockdownMode: false,
          allowedAttempts: 1,
          maxViolations: 3,
        },
        grading: {
          autoGrade: false,
          passingScore: 60,
          showResults: "after_deadline",
          allowRetakes: false,
        },
      });

      onClose();

      // Refresh the page to show the new task
      window.location.reload();
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Error creating task. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              {taskType === "quiz" && (
                <BookOpen className="w-5 h-5 text-white" />
              )}
              {taskType === "test" && <Target className="w-5 h-5 text-white" />}
              {taskType === "assignment" && (
                <FileText className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Create {taskType}
              </h2>
              <p className="text-sm text-muted-foreground">
                Step {currentStep} of {totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-foreground">
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Subject
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground"
                >
                  <option value="">
                    {loadingSubjects
                      ? "Loading subjects..."
                      : subjectOptions.length === 0
                        ? "No subjects available"
                        : "Select Subject"}
                  </option>
                  {subjectOptions.map((subject) => (
                    <option key={subject.id} value={subject.name}>
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>
                {subjectsError && (
                  <p className="mt-1 text-xs text-destructive">
                    {subjectsError}
                  </p>
                )}
              </div>

              {taskType === "quiz" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Class
                  </label>
                <select
                    value={
                      formData.cls.trim()
                        ? getFacultyClassOptionKey({
                            className: formData.cls,
                            batchId: formData.batchId ?? null,
                          })
                        : ""
                    }
                    onChange={(e) => {
                      const selectedClass = facultyClasses.find(
                        (option) =>
                          getFacultyClassOptionKey(option) === e.target.value,
                      );
                      setFormData((prev) => ({
                        ...prev,
                        batchId: selectedClass?.batchId ?? null,
                        cls: selectedClass?.className ?? "",
                      }));
                    }}
                    className="w-full p-3 rounded-xl border border-border bg-background text-foreground"
                    disabled={loadingFacultyClasses || facultyClasses.length === 0}
                  >
                    <option value="">
                      {loadingFacultyClasses
                        ? "Loading assigned classes..."
                        : facultyClasses.length === 0
                          ? "No assigned classes available"
                          : "Select Class"}
                    </option>
                    {facultyClasses.map((option) => (
                      <option
                        key={getFacultyClassOptionKey(option)}
                        value={getFacultyClassOptionKey(option)}
                      >
                        {option.className}
                      </option>
                    ))}
                  </select>
                  {facultyClassesError && (
                    <p className="mt-1 text-xs text-destructive">
                      {facultyClassesError}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className="w-full p-3 rounded-xl border border-border bg-background text-foreground h-24"
                placeholder="Describe the task objectives and requirements"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    handleInputChange("priority", e.target.value)
                  }
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {isSecurityNeeded && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) =>
                        handleInputChange("duration", parseInt(e.target.value))
                      }
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Allowed Attempts
                    </label>
                    <input
                      type="number"
                      value={formData.proctoring.allowedAttempts}
                      onChange={(e) =>
                        handleNestedChange(
                          "proctoring",
                          "allowedAttempts",
                          parseInt(e.target.value),
                        )
                      }
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground"
                      min="1"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Schedule & Timing */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-foreground">
              Schedule & Timing
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Start Time
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        handleInputChange("startDate", e.target.value)
                      }
                      min={today}
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) =>
                        handleInputChange("startTime", e.target.value)
                      }
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" /> End Time
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        handleInputChange("endDate", e.target.value)
                      }
                      min={formData.startDate}
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) =>
                        handleInputChange("endTime", e.target.value)
                      }
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Schedule Presets */}
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
              <h4 className="font-medium text-foreground mb-3">
                Quick Schedule
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date(
                      now.getTime() + 24 * 60 * 60 * 1000,
                    );
                    const tomorrowDate = tomorrow.toISOString().split("T")[0];
                    handleInputChange("startDate", tomorrowDate);
                    handleInputChange("endDate", tomorrowDate);
                  }}
                  className="px-3 py-2 text-xs rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextWeek = new Date(
                      now.getTime() + 7 * 24 * 60 * 60 * 1000,
                    );
                    const nextWeekDate = nextWeek.toISOString().split("T")[0];
                    handleInputChange("startDate", nextWeekDate);
                    handleInputChange("endDate", nextWeekDate);
                  }}
                  className="px-3 py-2 text-xs rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20"
                >
                  Next Week
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange("startTime", "09:00");
                    handleInputChange("endTime", "10:30");
                  }}
                  className="px-3 py-2 text-xs rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20"
                >
                  Morning
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange("startTime", "14:00");
                    handleInputChange("endTime", "15:30");
                  }}
                  className="px-3 py-2 text-xs rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20"
                >
                  Afternoon
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Security & Proctoring (Only for Quiz/Test) */}
        {currentStep === 3 && isSecurityNeeded && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-foreground">
              Security & Proctoring
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["basic", "standard", "strict"].map((level) => (
                <div
                  key={level}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    formData.proctoring.level === level
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() =>
                    handleNestedChange("proctoring", "level", level)
                  }
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4" />
                    <span className="font-medium capitalize">{level}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {level === "basic" &&
                      "Basic monitoring with focus tracking"}
                    {level === "standard" &&
                      "Standard monitoring with tab switching detection"}
                    {level === "strict" &&
                      "Strict monitoring with webcam and screen recording"}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.proctoring.enableWebcam}
                  onChange={(e) =>
                    handleNestedChange(
                      "proctoring",
                      "enableWebcam",
                      e.target.checked,
                    )
                  }
                  className="rounded"
                />
                <span className="text-sm text-foreground">
                  Enable webcam monitoring
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.proctoring.enableScreenShare}
                  onChange={(e) =>
                    handleNestedChange(
                      "proctoring",
                      "enableScreenShare",
                      e.target.checked,
                    )
                  }
                  className="rounded"
                />
                <span className="text-sm text-foreground">
                  Enable screen sharing
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.proctoring.lockdownMode}
                  onChange={(e) =>
                    handleNestedChange(
                      "proctoring",
                      "lockdownMode",
                      e.target.checked,
                    )
                  }
                  className="rounded"
                />
                <span className="text-sm text-foreground">
                  Enable lockdown mode (fullscreen)
                </span>
              </label>

              {/* Max Violations Setting */}
              <div className="mt-4 pt-4 border-t border-border">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Maximum Allowed Violations
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.proctoring.maxViolations}
                    onChange={(e) =>
                      handleNestedChange(
                        "proctoring",
                        "maxViolations",
                        parseInt(e.target.value),
                      )
                    }
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-foreground w-8 text-center">
                    {formData.proctoring.maxViolations}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Number of violations before test is auto-submitted (1-10)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions & Final Settings (Step 3 for Assignment/Event, Step 4 for Quiz/Test) */}
        {((currentStep === 3 && !isSecurityNeeded) ||
          (currentStep === 4 && isSecurityNeeded)) && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-foreground">
              Instructions & Final Settings
            </h3>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-foreground">
                  Task Instructions
                </label>
                <button
                  onClick={addInstruction}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                >
                  <Plus className="w-4 h-4" /> Add Instruction
                </button>
              </div>

              <div className="space-y-2">
                {formData.instructions.map((instruction, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      className="flex-1 p-3 rounded-xl border border-border bg-background text-foreground"
                      placeholder={`Instruction ${index + 1}`}
                    />
                    {formData.instructions.length > 1 && (
                      <button
                        onClick={() => removeInstruction(index)}
                        className="w-10 h-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Grading Settings */}
            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
              <h4 className="font-medium text-foreground mb-4">
                Grading & Results
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    value={formData.grading.passingScore}
                    onChange={(e) =>
                      handleNestedChange(
                        "grading",
                        "passingScore",
                        parseInt(e.target.value),
                      )
                    }
                    className="w-full p-3 rounded-xl border border-border bg-background text-foreground"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    Show Results
                  </label>
                  <select
                    value={formData.grading.showResults}
                    onChange={(e) =>
                      handleNestedChange(
                        "grading",
                        "showResults",
                        e.target.value,
                      )
                    }
                    className="w-full p-3 rounded-xl border border-border bg-background text-foreground"
                  >
                    <option value="immediate">Immediately</option>
                    <option value="after_deadline">After Deadline</option>
                    <option value="manual">Manual Release</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.grading.autoGrade}
                    onChange={(e) =>
                      handleNestedChange(
                        "grading",
                        "autoGrade",
                        e.target.checked,
                      )
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-foreground">
                    Enable auto-grading
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.grading.allowRetakes}
                    onChange={(e) =>
                      handleNestedChange(
                        "grading",
                        "allowRetakes",
                        e.target.checked,
                      )
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-foreground">Allow retakes</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground disabled:opacity-50"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {currentStep < totalSteps ? (
              <button
                onClick={() =>
                  setCurrentStep(Math.min(totalSteps, currentStep + 1))
                }
                className="px-6 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!isFormValid()}
                className="px-6 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {taskType === "quiz" ? "Create Quiz" : "Create Task"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateTaskModal;
