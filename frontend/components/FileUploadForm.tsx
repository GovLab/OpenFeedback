"use client";

import { useState } from "react";
import { api, FileUploadResponse, IndividualResponse, ClassifiedFeedback } from "@/lib/api";

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
  const [expandedCategories, setExpandedCategories] = useState<Map<number, Set<string>>>(new Map());

  const toggleCategory = (responseIndex: number, category: string) => {
    setExpandedCategories(prev => {
      const newMap = new Map(prev);
      const categories = newMap.get(responseIndex) || new Set<string>();
      const newCategories = new Set(categories);
      if (newCategories.has(category)) {
        newCategories.delete(category);
      } else {
        newCategories.add(category);
      }
      newMap.set(responseIndex, newCategories);
      return newMap;
    });
  };

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

  const clearFile = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--boston-charles-blue)' }}>
        Upload Feedback File
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="file-upload"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--boston-charles-blue)' }}
          >
            Select File (PDF, TXT, or DOCX)
          </label>
          <input
            type="file"
            id="file-upload"
            onChange={handleFileSelect}
            accept=".pdf,.txt,.docx"
            className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:border-transparent"
            style={{ 
              borderColor: 'var(--boston-gray-medium)',
              color: 'var(--boston-charles-blue)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--boston-optimistic-blue)';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24, 113, 189, 0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--boston-gray-medium)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            disabled={loading}
          />

          {selectedFile && (
            <div className="mt-2 p-3 border rounded-md" style={{ backgroundColor: 'rgba(24, 113, 189, 0.05)', borderColor: 'rgba(24, 113, 189, 0.2)' }}>
              <p className="text-sm" style={{ color: 'var(--boston-optimistic-blue)' }}>
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
              className="flex-1 py-2 px-4 rounded-md disabled:cursor-not-allowed transition-colors text-white"
              style={{ 
                backgroundColor: loading ? 'var(--boston-gray-medium-dark)' : 'var(--boston-optimistic-blue)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#155a9a';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'var(--boston-optimistic-blue)';
                }
              }}
            >
              {loading ? "Processing..." : "Process & Store"}
            </button>

            <button
              type="button"
              onClick={handleClassifyOnly}
              disabled={loading}
              className="flex-1 py-2 px-4 rounded-md disabled:cursor-not-allowed transition-colors text-white"
              style={{ 
                backgroundColor: loading ? 'var(--boston-gray-medium-dark)' : 'var(--boston-green)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#1a6f1a';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'var(--boston-green)';
                }
              }}
            >
              {loading ? "Classifying..." : "Classify Only"}
            </button>

            <button
              type="button"
              onClick={clearFile}
              disabled={loading}
              className="px-4 py-2 rounded-md disabled:cursor-not-allowed transition-colors"
              style={{ 
                backgroundColor: loading ? 'var(--boston-gray-medium-dark)' : 'var(--boston-charles-blue)',
                color: 'white',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#061622';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'var(--boston-charles-blue)';
                }
              }}
            >
              Clear
            </button>
          </div>
        )}
      </form>

      {error && (
        <div className="mt-4 p-4 border rounded-md" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', borderColor: 'var(--sentiment-negative)', color: 'var(--sentiment-negative)' }}>
          {error}
        </div>
      )}

      {result && result.individual_responses && result.individual_responses.length > 0 && (
        <div className="mt-4 p-4 border rounded-md" style={{ backgroundColor: 'var(--boston-gray-light)', borderColor: 'var(--boston-gray-medium)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--boston-charles-blue)' }}>
            File Processed Successfully!
          </h3>
          
          <div className="text-sm space-y-2 mb-4" style={{ color: 'var(--boston-charles-blue)' }}>
            <p><strong>File:</strong> {result.original_filename}</p>
            <p><strong>Type:</strong> {result.file_type}</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-lg font-semibold mb-3" style={{ color: 'var(--boston-charles-blue)' }}>
              Individual Feedback
              <span className="ml-2 text-sm font-normal px-2 py-1 rounded-full" style={{ color: 'var(--boston-charles-blue)', backgroundColor: 'rgba(9, 31, 47, 0.1)' }}>
                {result.individual_responses.length} item{result.individual_responses.length !== 1 ? 's' : ''}
              </span>
            </h4>

            {result.individual_responses.length === 1 ? (
              <div
                key={0}
                className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                style={{ borderColor: 'var(--boston-gray-medium)' }}
              >
                {/* Header with Sentiment */}
                {result.individual_responses[0].classified_feedback && (
                  <div className="px-5 pt-5 pb-3 flex justify-between items-start border-b" style={{ borderColor: 'var(--boston-gray-medium)' }}>
                    <h5 className="text-sm font-semibold" style={{ color: 'var(--boston-charles-blue)' }}>Feedback Details</h5>
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-semibold text-white capitalize"
                      style={{
                        backgroundColor: result.individual_responses[0].classified_feedback.sentiment.toLowerCase() === 'positive'
                          ? 'var(--sentiment-positive)'
                          : result.individual_responses[0].classified_feedback.sentiment.toLowerCase() === 'negative'
                          ? 'var(--sentiment-negative)'
                          : 'var(--sentiment-neutral)'
                      }}
                    >
                      {result.individual_responses[0].classified_feedback.sentiment}
                    </span>
                  </div>
                )}
                
                <div className="p-5 space-y-5">
                  {/* Message */}
                  <div>
                    <h6 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--boston-gray-dark)' }}>Summary</h6>
                    <p className="leading-relaxed text-sm mb-3" style={{ color: 'var(--boston-charles-blue)' }}>
                      {result.individual_responses[0].message}
                    </p>
                  </div>

                  {/* Text Content */}
                  {result.individual_responses[0].text_content && (
                    <div 
                      className="p-3 rounded-md overflow-y-auto min-h-24 max-h-32 text-sm"
                      style={{ 
                        backgroundColor: 'var(--boston-gray-light)',
                        color: 'var(--boston-charles-blue)',
                        border: '1px solid var(--boston-gray-medium)'
                      }}
                    >
                      <p className="whitespace-pre-wrap">{result.individual_responses[0].text_content}</p>
                    </div>
                  )}

                  {/* Categories */}
                  {result.individual_responses[0].classified_feedback && result.individual_responses[0].classified_feedback.category_map && (
                    <div>
                      <h6 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--boston-gray-dark)' }}>Categories</h6>
                      <div className="space-y-2">
                        {Object.entries(result.individual_responses[0].classified_feedback.category_map).map(([category, subcategories], i) => {
                          const isExpanded = expandedCategories.get(0)?.has(category) || false;
                          const hasSubcategories = subcategories && subcategories.length > 0;
                          return (
                            <div key={i} className="space-y-2">
                              <button
                                onClick={() => hasSubcategories && toggleCategory(0, category)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-lg font-semibold border transition-all text-left ${hasSubcategories ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                style={{ 
                                  backgroundColor: 'rgba(110, 231, 183, 0.15)', 
                                  color: '#10b981',
                                  borderColor: 'rgba(110, 231, 183, 0.3)'
                                }}
                                disabled={!hasSubcategories}
                              >
                                <span className="text-left flex-1">{category}</span>
                                {hasSubcategories && (
                                  <span className="text-xs flex-shrink-0 ml-2">
                                    {isExpanded ? '▼' : '▶'} ({subcategories.length})
                                  </span>
                                )}
                              </button>
                              {hasSubcategories && isExpanded && (
                                <div className="flex flex-wrap gap-2 pl-4">
                                  {subcategories.map((subcat, idx) => (
                                    <span
                                      key={idx}
                                      className="px-3 py-1.5 text-xs rounded-lg font-semibold border"
                                      style={{ 
                                        backgroundColor: 'rgba(252, 211, 77, 0.15)', 
                                        color: '#f59e0b',
                                        borderColor: 'rgba(252, 211, 77, 0.3)'
                                      }}
                                    >
                                      {subcat}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.individual_responses.map((response, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
                    style={{ borderColor: 'var(--boston-gray-medium)' }}
                  >
                    {/* Header with Sentiment */}
                    {response.classified_feedback && (
                      <div className="px-4 pt-4 pb-2 flex justify-between items-center border-b" style={{ borderColor: 'var(--boston-gray-medium)' }}>
                        <h6 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--boston-gray-dark)' }}>Feedback {index + 1}</h6>
                        <span 
                          className="px-2.5 py-1 rounded-full text-xs font-semibold text-white capitalize"
                          style={{
                            backgroundColor: response.classified_feedback.sentiment.toLowerCase() === 'positive'
                              ? 'var(--sentiment-positive)'
                              : response.classified_feedback.sentiment.toLowerCase() === 'negative'
                              ? 'var(--sentiment-negative)'
                              : 'var(--sentiment-neutral)'
                          }}
                        >
                          {response.classified_feedback.sentiment}
                        </span>
                      </div>
                    )}
                    
                    <div className="p-4 flex-1 flex flex-col space-y-3">
                      {/* Text Content */}
                      {response.text_content && (
                        <div 
                          className="p-2 rounded-md overflow-y-auto min-h-16 max-h-24 text-xs flex-shrink-0"
                          style={{ 
                            backgroundColor: 'var(--boston-gray-light)',
                            color: 'var(--boston-charles-blue)',
                            border: '1px solid var(--boston-gray-medium)'
                          }}
                        >
                          <p className="whitespace-pre-wrap">{response.text_content}</p>
                        </div>
                      )}

                      {/* Categories */}
                      {response.classified_feedback && response.classified_feedback.category_map && (
                        <div className="flex-shrink-0 space-y-1.5">
                          {Object.entries(response.classified_feedback.category_map).slice(0, 2).map(([category, subcategories], i) => {
                            const isExpanded = expandedCategories.get(index)?.has(category) || false;
                            const hasSubcategories = subcategories && subcategories.length > 0;
                            return (
                              <div key={i} className="space-y-1.5">
                                <button
                                  onClick={() => hasSubcategories && toggleCategory(index, category)}
                                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg font-semibold border transition-all text-left ${hasSubcategories ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                  style={{ 
                                    backgroundColor: 'rgba(110, 231, 183, 0.15)', 
                                    color: '#10b981',
                                    borderColor: 'rgba(110, 231, 183, 0.3)'
                                  }}
                                  disabled={!hasSubcategories}
                                >
                                  <span className="text-left flex-1 truncate">{category}</span>
                                  {hasSubcategories && (
                                    <span className="text-xs flex-shrink-0 ml-2">
                                      {isExpanded ? '▼' : '▶'} ({subcategories.length})
                                    </span>
                                  )}
                                </button>
                                {hasSubcategories && isExpanded && (
                                  <div className="flex flex-wrap gap-1.5 pl-3">
                                    {subcategories.map((subcat, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2.5 py-1 text-xs rounded-lg font-semibold border"
                                        style={{ 
                                          backgroundColor: 'rgba(252, 211, 77, 0.15)', 
                                          color: '#f59e0b',
                                          borderColor: 'rgba(252, 211, 77, 0.3)'
                                        }}
                                      >
                                        {subcat}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {response.classified_feedback.category_map && Object.keys(response.classified_feedback.category_map).length > 2 && (
                            <span className="text-xs px-2 py-1 block" style={{ color: 'var(--boston-gray-dark)' }}>
                              +{Object.keys(response.classified_feedback.category_map).length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
