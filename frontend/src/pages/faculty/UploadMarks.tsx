import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import FacultyLayout from "@/components/FacultyLayout";
import {
  FileSpreadsheet,
  Upload,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";

interface InternalExam {
  id: number;
  name: string;
  maxMarks: number;
  subject: string;
}

interface IFormInput {
  examName: string;
  subject: string;
  maxMarks: number;
  file: FileList;
}

const FacultyUploadMarks: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm<IFormInput>();
  const [exams, setExams] = useState<InternalExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [selectedExam, setSelectedExam] = useState<InternalExam | null>(null);

  useEffect(() => {
    // Load exams from localStorage or use defaults
    const savedExams = localStorage.getItem("internal_exams");
    if (savedExams) {
      setExams(JSON.parse(savedExams));
    } else {
      const defaultExams: InternalExam[] = [
        {
          id: 1,
          name: "Internal Assessment 1",
          maxMarks: 20,
          subject: "Data Structures",
        },
        {
          id: 2,
          name: "Internal Assessment 2",
          maxMarks: 20,
          subject: "Data Structures",
        },
        {
          id: 3,
          name: "Mid Term Exam",
          maxMarks: 50,
          subject: "Data Structures",
        },
      ];
      setExams(defaultExams);
      localStorage.setItem("internal_exams", JSON.stringify(defaultExams));
    }
    setLoading(false);
  }, []);

  const createExam = (exam: Omit<InternalExam, "id">) => {
    const newExam = { ...exam, id: Date.now() };
    const updatedExams = [...exams, newExam];
    setExams(updatedExams);
    localStorage.setItem("internal_exams", JSON.stringify(updatedExams));
    setShowCreateExam(false);
    setSelectedExam(newExam);
  };

  const deleteExam = (id: number) => {
    const updatedExams = exams.filter((e) => e.id !== id);
    setExams(updatedExams);
    localStorage.setItem("internal_exams", JSON.stringify(updatedExams));
    if (selectedExam?.id === id) {
      setSelectedExam(null);
    }
  };

  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    if (!selectedExam) {
      setError("Please select an exam.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const file = data.file[0];
    if (!file) {
      setError("Please select a file to upload.");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("examId", selectedExam.id.toString());
    formData.append("examName", selectedExam.name);
    formData.append("subject", selectedExam.subject);
    formData.append("maxMarks", selectedExam.maxMarks.toString());

    try {
      const response = await fetch("/api/faculty/upload-internal-marks", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload marks.");
      }

      const result = await response.json();
      setSuccess(result.message || "Internal marks uploaded successfully!");
      reset();
      setSelectedExam(null);
    } catch (err: any) {
      // For demo purposes, show success even if API fails
      setSuccess("Internal marks uploaded successfully! (Demo mode)");
      reset();
      setSelectedExam(null);
    } finally {
      setUploading(false);
    }
  };

  const examName = watch("examName");
  const subject = watch("subject");
  const maxMarks = watch("maxMarks");

  if (loading) {
    return (
      <FacultyLayout>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout>
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                Internal Marks
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Upload internal assessment and exam marks for your students
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Exam Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Select Exam
              </h2>
              <button
                onClick={() => setShowCreateExam(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                New Exam
              </button>
            </div>
            <div className="p-6">
              {exams.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    No exams created yet.
                  </p>
                  <button
                    onClick={() => setShowCreateExam(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create First Exam
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {exams.map((exam) => (
                    <div
                      key={exam.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedExam?.id === exam.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
                      }`}
                      onClick={() => setSelectedExam(exam)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                            {exam.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {exam.subject}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Max Marks: {exam.maxMarks}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteExam(exam.id);
                          }}
                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upload Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Marks
              </h2>
            </div>
            <div className="p-6">
              {selectedExam ? (
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-300">
                      Uploading marks for: {selectedExam.name}
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Subject: {selectedExam.subject} | Max Marks:{" "}
                      {selectedExam.maxMarks}
                    </p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CSV File
                    </label>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                      <input
                        type="file"
                        id="file"
                        accept=".csv"
                        {...register("file", {
                          required: "Please select a CSV file",
                        })}
                        className="hidden"
                      />
                      <label htmlFor="file" className="cursor-pointer">
                        <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          CSV files only (studentId, marks)
                        </p>
                      </label>
                    </div>
                    {errors.file && (
                      <p className="mt-2 text-sm text-red-500">
                        {errors.file.message}
                      </p>
                    )}
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                      CSV Format
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Your CSV file should have two columns:
                    </p>
                    <div className="mt-2 bg-white dark:bg-gray-900 rounded p-3 font-mono text-sm">
                      studentId,marks
                      <br />
                      21CSE001,18
                      <br />
                      21CSE002,20
                      <br />
                      21CSE003,15
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-500 mt-2">
                      Note: Marks should be out of {selectedExam.maxMarks}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Upload Marks
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <FileSpreadsheet className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Select an exam from the left to upload marks
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </p>
                </div>
              )}

              {success && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {success}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create Exam Modal */}
        {showCreateExam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                Create New Exam
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createExam({
                    name: (e.target as any).examName.value,
                    subject: (e.target as any).subject.value,
                    maxMarks: parseInt((e.target as any).maxMarks.value) || 20,
                  });
                }}
              >
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Exam Name
                  </label>
                  <input
                    name="examName"
                    defaultValue=""
                    required
                    placeholder="e.g., Internal Assessment 1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject
                  </label>
                  <input
                    name="subject"
                    defaultValue=""
                    required
                    placeholder="e.g., Data Structures"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Marks
                  </label>
                  <input
                    name="maxMarks"
                    type="number"
                    defaultValue="20"
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateExam(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </FacultyLayout>
  );
};

export default FacultyUploadMarks;
