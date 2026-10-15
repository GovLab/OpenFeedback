"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, FileText, LoaderCircle } from "lucide-react";
import { api, FileUploadResponse } from "@/lib/api";
import { UploadResultCard } from "@/components/upload/UploadResultCard";
import { Badge } from "@/components/ui/Badge";
import { buttonClass, CARD } from "@/components/ui/styles";

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
  const [action, setAction] = useState<"store" | "classify" | null>(null);
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
    setAction("store");
    setError(null);
    setResult(null);

    try {
      const uploadResult = await api.uploadFeedbackFile(selectedFile);
      setResult(uploadResult);
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
    setAction("classify");
    setError(null);

    try {
      const classified = await api.classifyFeedbackFile(selectedFile);
      setResult(classified);
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
  };

  const responses = result?.individual_responses ?? [];

  return (
    <div className={`${CARD} p-6`}>
      <h3 className="mb-4 text-base text-[#091F2F]">Upload Feedback File</h3>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="file-upload" className="mb-2 block text-sm font-medium text-slate-800">
            Select File (PDF, TXT, or DOCX)
          </label>
          <input
            type="file"
            id="file-upload"
            onChange={handleFileSelect}
            accept=".pdf,.txt,.docx"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "file-upload-error" : selectedFile ? "file-upload-selected" : undefined}
            className="block w-full cursor-pointer rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2 text-sm text-slate-700 transition-colors hover:border-[#1871bd] file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#1871bd] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#091F2F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1871bd] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          />

          {selectedFile && (
            <p
              id="file-upload-selected"
              className="mt-2 flex items-center gap-2 rounded-lg border border-[#1871bd]/20 bg-[#1871bd]/5 px-3 py-2 text-sm text-[#0f4c81]"
            >
              <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </p>
          )}
        </div>

        {selectedFile && (
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={loading} className={buttonClass("primary", "md", "flex-1")}>
              {loading && action === "store" && <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
              {loading ? "Processing..." : "Process & Store"}
            </button>
            <button type="button" onClick={handleClassifyOnly} disabled={loading} className={buttonClass("secondary", "md", "flex-1")}>
              {loading && action === "classify" && <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
              {loading ? "Classifying..." : "Classify Only"}
            </button>
            <button type="button" onClick={clearFile} disabled={loading} className={buttonClass("ghost", "md")}>
              Clear
            </button>
          </div>
        )}
      </form>

      {error && (
        <p
          id="file-upload-error"
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-[var(--text-danger)]"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {responses.length > 0 && result && (
        <div role="status" className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm text-[#091F2F]">
            <CircleCheck className="h-5 w-5 text-[var(--text-success)]" aria-hidden="true" />
            File Processed Successfully!
          </h4>

          <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-[#091F2F]">
            <dt className="font-semibold">File:</dt>
            <dd className="break-all">{result.original_filename}</dd>
            <dt className="font-semibold">Type:</dt>
            <dd className="break-all">{result.file_type}</dd>
          </dl>

          <h4 className="mb-3 flex items-center gap-2 text-sm text-[#091F2F]">
            Individual Feedback
            <Badge>{responses.length} item{responses.length !== 1 ? "s" : ""}</Badge>
          </h4>

          {responses.length === 1 ? (
            <UploadResultCard response={responses[0]} index={0} compact={false} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {responses.map((response, index) => (
                <UploadResultCard key={index} response={response} index={index} compact />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
