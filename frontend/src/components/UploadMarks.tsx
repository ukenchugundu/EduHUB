import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

interface IFormInput {
  file: FileList;
}

const UploadMarks: React.FC = () => {
  const { register, handleSubmit } = useForm<IFormInput>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
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

    try {
      const response = await fetch("/api/faculty/upload-marks", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload marks.");
      }

      const result = await response.json();
      setSuccess(result.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
        Upload Marks
      </h2>
      <p className="mb-4 text-gray-600 dark:text-gray-400">
        Upload a CSV file with student marks. The file should have two columns:
        'studentId' and 'marks'.
      </p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label
            htmlFor="file"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            CSV File
          </label>
          <input
            type="file"
            id="file"
            {...register("file", { required: true })}
            className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>
      {error && <p className="mt-4 text-red-500">{error}</p>}
      {success && <p className="mt-4 text-green-500">{success}</p>}
    </div>
  );
};

export default UploadMarks;
