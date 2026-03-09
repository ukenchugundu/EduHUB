import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import FacultyLayout from "@/components/FacultyLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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

  const saveAssignment = async () => {
    // In a real app, you'd send this to the backend
    console.log({ taskData });
    try {
      const fullAssignmentData = {
        ...taskData,
        id: Date.now().toString(),
        type: "assignment",
        createdAt: new Date().toISOString(),
        status: "scheduled",
        students: 45,
        submissions: 0,
      };

      // Store in localStorage for demo
      const existingTasks = JSON.parse(
        localStorage.getItem("faculty_tasks") || "[]",
      );
      existingTasks.push(fullAssignmentData);
      localStorage.setItem("faculty_tasks", JSON.stringify(existingTasks));

      toast.success("Assignment saved successfully!");
      navigate("/faculty/tasks");
    } catch (error: any) {
      toast.error(error.message);
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
              <Input
                placeholder="e.g., III CSE-A"
                value={taskData.cls}
                onChange={(e) =>
                  setTaskData({ ...taskData, cls: e.target.value })
                }
              />
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
          <Button onClick={saveAssignment}>
            <Save className="mr-2" /> Save Assignment
          </Button>
        </div>
      </div>
    </FacultyLayout>
  );
};

export default CreateAssignment;
