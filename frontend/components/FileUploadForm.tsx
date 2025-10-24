"use client";

import { useState } from "react";
import { api, FileUploadResponse, IndividualResponse, ClassifiedFeedback } from "@/lib/api";

interface FileUploadFormProps {
  onFeedbackSubmitted: () => void;
}

interface IndividualFeedbackModalProps {
  response: IndividualResponse;
  isOpen: boolean;
  onClose: () => void;
}

function IndividualFeedbackModal({ response, isOpen, onClose }: IndividualFeedbackModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Feedback Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Text Content:</h4>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                {response.text_content}
              </p>
            </div>
            
            {response.classified_feedback && response.classified_feedback.category_map && (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Categories & Subcategories:</h4>
                  <div className="space-y-3">
                    {Object.entries(response.classified_feedback.category_map).map(([category, subcategories]) => (
                      <div key={category} className="space-y-1">
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                            {category}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 ml-4">
                          {subcategories.map((subcategory, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                            >
                              {subcategory}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <h4 className="font-medium text-gray-700 mb-2">Sentiment:</h4>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    response.classified_feedback.sentiment.toLowerCase() === 'positive' 
                      ? 'bg-green-100 text-green-800'
                      : response.classified_feedback.sentiment.toLowerCase() === 'negative'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {response.classified_feedback.sentiment}
                  </span>
                </div>
              </div>
            )}
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Status:</h4>
              <p className="text-sm text-gray-600">{response.message}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FileUploadForm({
  onFeedbackSubmitted,
}: FileUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FileUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIndividualResponse, setSelectedIndividualResponse] = useState<IndividualResponse | null>(null);

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

  const handleIndividualFeedbackClick = (response: IndividualResponse) => {
    setSelectedIndividualResponse(response);
    setIsModalOpen(true);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
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

      {result && result.individual_responses && result.individual_responses.length > 0 && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded-md">
          <h3 className="font-semibold text-green-800 mb-4">
            File Processed Successfully!
          </h3>
          
          <div className="text-sm text-green-700 space-y-2 mb-4">
            <p><strong>File:</strong> {result.original_filename}</p>
            <p><strong>Type:</strong> {result.file_type}</p>
            <p><strong>Total Feedback Items:</strong> {result.individual_responses.length}</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-green-800 mb-3">
              Individual Feedback
              <span className="ml-2 text-sm font-normal text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {result.individual_responses.length} item{result.individual_responses.length !== 1 ? 's' : ''}
              </span>
            </h4>

            {result.individual_responses.length === 1 ? (
              console.log("result.individual_responses[0]",result.individual_responses[0]),
              <div
                key={0}
                className="bg-white rounded-xl border border-green-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex justify-between items-center"
              >
                <div className="flex-1 pr-4">
                  <p className="text-gray-800 leading-relaxed">
                    {result.individual_responses[0].message}
                  </p>
                  {result.individual_responses[0].classified_feedback && (
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {result.individual_responses[0].classified_feedback.category_map && Object.keys(result.individual_responses[0].classified_feedback.category_map).map((cat, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
                        >
                          {cat}
                        </span>
                      ))}
                      <span className={`ml-auto px-2.5 py-1 rounded-full text-xs font-medium ${
                            result.individual_responses[0].classified_feedback.sentiment.toLowerCase() === 'positive'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : result.individual_responses[0].classified_feedback.sentiment.toLowerCase() === 'negative'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                        {result.individual_responses[0].classified_feedback.sentiment}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleIndividualFeedbackClick(result.individual_responses[0])}
                  className="ml-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow"
                >
                  View Details
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.individual_responses.map((response, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl border border-green-200 p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 leading-relaxed mb-3 line-clamp-3">
                        {response.message}
                      </p>
                      {response.classified_feedback && (
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {response.classified_feedback.category_map && Object.keys(response.classified_feedback.category_map).map((cat, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
                            >
                              {cat}
                            </span>
                          ))}
                          {response.classified_feedback.category_map && Object.keys(response.classified_feedback.category_map).length > 2 && (
                            <span className="text-xs text-gray-500">+{Object.keys(response.classified_feedback.category_map).length - 2}</span>
                          )}
                          <span className={`ml-auto px-2.5 py-1 rounded-full text-xs font-medium ${
                                response.classified_feedback.sentiment.toLowerCase() === 'positive'
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : response.classified_feedback.sentiment.toLowerCase() === 'negative'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                            {response.classified_feedback.sentiment}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleIndividualFeedbackClick(response)}
                      className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedIndividualResponse && (
        <IndividualFeedbackModal
          response={selectedIndividualResponse}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
