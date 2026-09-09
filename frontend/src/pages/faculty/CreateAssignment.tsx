import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import FacultyLayout from "@/components/FacultyLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { readStoredAuth } from "@/lib/authSession";
import {
  fetchFacultyClassAllocations,
  getFacultyClassOptionKey,
  mergeFacultyClassAllocationOptions,
  type FacultyClassAllocationOption,
} from "@/lib/facultyClassAllocations";

const API_BASE = (import.meta.env.VITE_API_URL || "https://eduhub-backend-pf6o.onrender.com").replace(/\/$/, "");

const CreateAssignment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialTaskData = location.state?.taskData;

  const [taskData, setTaskData] = useState({
    title: initialTaskData?.title || "New Assignment",
    cls: initialTaskData?.cls || "",
    subject: initialTaskData?.subject || "",
    description: initialTaskData?.description || "",
    dueDate: initialTaskData?.dueDate || "",
    maxScore: initialTaskData?.maxScore || 100,
    allowedFormats: initialTaskData?.allowedFormats || ["pdf", "docx"],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [classOptions, setClassOptions] = useState<FacultyClassAllocationOption[]>(
    [],
  );
  const [loadingClassOptions, setLoadingClassOptions] = useState(false);
  const [classOptionsError, setClassOptionsError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadClassOptions = async () => {
      setLoadingClassOptions(true);
      setClassOptionsError("");
      try {
        const options = await fetchFacultyClassAllocations(controller.signal);
        setClassOptions(options);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setClassOptions([]);
        setClassOptionsError(
          error instanceof Error
            ? error.message
            : "Failed to load assigned classes.",
        );
      } finally {
        setLoadingClassOptions(false);
      }
    };

    void loadClassOptions();
    return () => controller.abort();
  }, []);

  const assignmentClassOptions = useMemo(
    () =>
      mergeFacultyClassAllocationOptions([
        ...classOptions,
        ...(taskData.cls
          ? [
              {
                className: taskData.cls,
                batchId: null,
                department: "",
                academicYear: "",
                section: "",
                studentCount: 0,
              },
            ]
          : []),
      ]),
    [classOptions, taskData.cls],
  );

  const saveAssignment = async () => {
    if (
      !taskData.title.trim() ||
      !taskData.cls.trim() ||
      !taskData.subject.trim() ||
      !taskData.dueDate.trim()
    ) {
      toast.error("Title, class, subject, and due date are required.");
      return;
    }

    const maxScore = Number(taskData.maxScore);
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      toast.error("Max score must be a positive number.");
      return;
    }

    try {
      setIsSaving(true);
      const auth = readStoredAuth();
      const response = await fetch(`${API_BASE}/api/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth?.token
            ? { Authorization: `Bearer ${auth.token}` }
            : {}),
        },
        body: JSON.stringify({
          cls: taskData.cls.trim(),
          subject: taskData.subject.trim(),
          title: taskData.title.trim(),
          description: taskData.description.trim(),
          dueDate: new Date(taskData.dueDate).toISOString(),
          maxScore,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(body?.error || "Failed to save assignment.");
      }

      toast.success("Assignment saved to database successfully.");
      navigate("/faculty/assignments");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </Button>
          <Input
            className="text-2xl font-bold"
            value={taskData.title}
            onChange={(e) =>
              setTaskData({ ...taskData, title: e.target.value })
            }
          />
        </div>

        <div className="p-6 bg-card rounded-lg shadow-md border border-border/50">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Assignment Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <select
                value={
                  taskData.cls
                    ? getFacultyClassOptionKey({
                        className: taskData.cls,
                        batchId: null,
                      })
                    : ""
                }
                onChange={(e) => {
                  const selected = assignmentClassOptions.find(
                    (option) => getFacultyClassOptionKey(option) === e.target.value,
                  );
                  setTaskData({
                    ...taskData,
                    cls: selected?.className ?? "",
                  });
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={loadingClassOptions || assignmentClassOptions.length === 0}
              >
                <option value="">
                  {loadingClassOptions
                    ? "Loading assigned classes..."
                    : assignmentClassOptions.length === 0
                      ? "No assigned classes available"
                      : "Select assigned class"}
                </option>
                {assignmentClassOptions.map((option) => (
                  <option
                    key={getFacultyClassOptionKey(option)}
                    value={getFacultyClassOptionKey(option)}
                  >
                    {option.className}
                  </option>
                ))}
              </select>
              {classOptionsError ? (
                <p className="text-xs text-destructive">{classOptionsError}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                placeholder="e.g., Data Structures"
                value={taskData.subject}
                onChange={(e) =>
                  setTaskData({ ...taskData, subject: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date & Time</label>
              <Input
                type="datetime-local"
                value={taskData.dueDate}
                onChange={(e) =>
                  setTaskData({ ...taskData, dueDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Score</label>
              <Input
                type="number"
                placeholder="100"
                value={taskData.maxScore}
                onChange={(e) =>
                  setTaskData({ ...taskData, maxScore: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">
                Allowed Document Formats
              </label>
              <div className="flex gap-4 mt-2">
                {["pdf", "docx", "pptx", "zip", "txt"].map((format) => (
                  <label
                    key={format}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={taskData.allowedFormats.includes(format)}
                      onChange={(e) => {
                        const newFormats = e.target.checked
                          ? [...taskData.allowedFormats, format]
                          : taskData.allowedFormats.filter((f) => f !== format);
                        setTaskData({
                          ...taskData,
                          allowedFormats: newFormats,
                        });
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm uppercase">{format}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-card rounded-lg shadow-md border border-border/50">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Document Submission Instructions
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Explain what the students need to include in their document
            submission (PDF, DOCX, or ZIP).
          </p>
          <Textarea
            placeholder="Enter detailed instructions for the assignment..."
            value={taskData.description}
            onChange={(e) =>
              setTaskData({ ...taskData, description: e.target.value })
            }
            className="min-h-[200px]"
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/faculty/assignments")}
          >
            Cancel
          </Button>
          <Button onClick={saveAssignment} disabled={isSaving}>
            <Save className="mr-2" /> {isSaving ? "Saving..." : "Save Assignment"}
          </Button>
        </div>
      </div>
    </FacultyLayout>
  );
};

export default CreateAssignment;
