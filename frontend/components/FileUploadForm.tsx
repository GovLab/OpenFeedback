"use client";

import { useState } from "react";
import { api, FileUploadResponse, ClassifiedFeedback } from "@/lib/api";

interface FileUploadFormProps {
  onFeedbackSubmitted: () => void;
}

export default function FileUploadForm({
  onFeedbackSubmitted,
}: FileUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FileUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [showExtractedText, setShowExtractedText] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (validTypes.includes(file.type)) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Please select a valid file (PDF, TXT, or DOCX)");
        setSelectedFile(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setExtractedText("");

    try {
      const uploadResult = await api.uploadFeedbackFile(selectedFile);
      setResult(uploadResult);
      setExtractedText(uploadResult.text_content);
      onFeedbackSubmitted();
    } catch (err) {
      setError("Failed to process file. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClassifyOnly = async () => {
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const classified = await api.uploadAndClassifyText(selectedFile);
      setResult({
        message: "File classified successfully",
        text_content: classified.text,
        original_filename: selectedFile.name,
        file_type: selectedFile.type,
        classified_feedback: classified,
      });
      setExtractedText(classified.text);
    } catch (err) {
      setError("Failed to classify file. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setExtractedText("");
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Upload Feedback File
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="file-upload"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Select File (PDF, TXT, or DOCX)
          </label>
          <input
            type="file"
            id="file-upload"
            onChange={handleFileSelect}
            accept=".pdf,.txt,.docx"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            disabled={loading}
          />

          {selectedFile && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Selected:</strong> {selectedFile.name} (
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Processing..." : "Process & Store"}
            </button>

            <button
              type="button"
              onClick={handleClassifyOnly}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Classifying..." : "Classify Only"}
            </button>

            <button
              type="button"
              onClick={clearFile}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {result && result.classified_feedback && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded-md">
          <h3 className="font-semibold text-green-800 mb-2">
            File Processed Successfully!
          </h3>
          <div className="text-sm text-green-700 space-y-1">
            <p>
              <strong>File:</strong> {result.original_filename}
            </p>
            <p>
              <strong>Type:</strong> {result.file_type}
            </p>
            <p>
              <strong>Categories:</strong>{" "}
              {result.classified_feedback.categories.join(", ")}
            </p>
            <p>
              <strong>Subcategories:</strong>{" "}
              {result.classified_feedback.subcategories.join(", ")}
            </p>
            <p>
              <strong>Sentiment:</strong> {result.classified_feedback.sentiment}
            </p>
            {extractedText && (
              <button
                type="button"
                onClick={() => setShowExtractedText(!showExtractedText)}
                className="text-blue-600 hover:text-blue-800 underline mt-2"
              >
                {showExtractedText ? "Hide" : "Show"} Extracted Text
              </button>
            )}
          </div>

          {showExtractedText && (
            <div className="mt-4 p-3 bg-white border border-gray-300 rounded-md max-h-32 overflow-y-auto">
              <p className="text-sm text-gray-700">{extractedText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
