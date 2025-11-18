"use client";

import { useState, useEffect } from "react";
import { api, FeedbackRecord } from "@/lib/api";

interface FeedbackTableProps {
  refreshTrigger?: number;
}

// Original Feedback Card Component
function OriginalFeedbackCard({ description }: { description: string }) {
  return (
    <div className="lg:col-span-6 bg-white rounded-lg p-3 border border-gray-300 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Original Feedback</h4>
      </div>
      <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap overflow-y-auto">
        {description}
      </p>
    </div>
  );
}

// Classification Card Component
interface ClassificationCardProps {
  permitType: string | null;
  category: string | null;
  subcategory: string | null;
  department: string | null;
  impactTypes: string[] | null;
}

function ClassificationCard({ permitType, category, subcategory, department, impactTypes }: ClassificationCardProps) {
  return (
    <div className="lg:col-span-6 bg-white rounded-lg p-3 border border-gray-300 shadow-sm">
      <div className="relative">
        <h4 className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--boston-charles-blue)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--boston-optimistic-blue)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Classification
        </h4>
        <div className="flex gap-2">
          {/* Left Column - Permit Type, Category, Department */}
          <div className="flex-1 flex flex-col gap-2">
            {/* Permit Type */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(24, 113, 189, 0.05)' }}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(24, 113, 189, 0.15)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--boston-optimistic-blue)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold block mb-0.5" style={{ color: 'var(--boston-optimistic-blue)' }}>Permit Type</span>
                <span className="font-bold text-gray-900 text-[15px] truncate block">{permitType || "N/A"}</span>
              </div>
            </div>

            {/* Category & Department - Row */}
            <div className="flex gap-2">
              {/* Category */}
              <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5" style={{ backgroundColor: 'rgba(24, 113, 189, 0.05)' }}>
                <div className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(24, 113, 189, 0.15)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--boston-optimistic-blue)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold block" style={{ color: 'var(--boston-optimistic-blue)' }}>Category</span>
                  <span className="font-bold text-gray-900 text-[13px] block max-w-full overflow-hidden text-ellipsis">{category || "N/A"}</span>
                  {subcategory && (
                    <span className="block text-[10px] font-medium max-w-full overflow-hidden text-ellipsis" style={{ color: 'var(--boston-charles-blue)' }}>→ {subcategory}</span>
                  )}
                </div>
              </div>

              {/* Department */}
              <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5 flex-wrap" style={{ backgroundColor: 'rgba(24, 113, 189, 0.05)' }}>
                <div className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(24, 113, 189, 0.15)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--boston-optimistic-blue)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold block" style={{ color: 'var(--boston-optimistic-blue)' }}>Department</span>
                  <span className="font-bold text-gray-900 text-[13px] break-words">{department || "Unassigned"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Impact Types */}
          {impactTypes && impactTypes.length > 0 && (
            <div className="flex flex-col bg-gray-50 rounded-lg p-2" style={{ backgroundColor: 'rgba(24, 113, 189, 0.05)' }}>
              <div className="flex items-center gap-1 mb-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--boston-optimistic-blue)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--boston-optimistic-blue)' }}>Impact</span>
              </div>
              <div className="flex flex-col gap-1">
                {impactTypes.map((impact, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded"
                    style={{ backgroundColor: 'var(--boston-gray-light)', color: 'var(--boston-optimistic-blue)' }}
                  >
                    {impact}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// AI Summary Card Component
function AISummaryCard({ summary, hasContact }: { summary: string; hasContact: boolean }) {
  return (
    <div className={`${hasContact ? 'lg:col-span-6' : 'lg:col-span-9'} bg-white rounded-lg p-3 shadow-sm`} style={{ backgroundColor: 'rgba(24, 113, 189, 0.03)' }}>
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--boston-optimistic-blue)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--boston-charles-blue)' }}>AI Summary</h4>
      </div>
      <p className="text-sm text-gray-900 italic leading-relaxed">
        {summary}
      </p>
    </div>
  );
}

// Contact Info Card Component
interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
}

function ContactInfoCard({ contactInfo }: { contactInfo: ContactInfo }) {
  return (
    <div className="lg:col-span-4 bg-white rounded-lg p-3 border border-gray-300 shadow-sm overflow-hidden">
      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: 'rgba(34, 139, 34, 0.15)' }}>
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--boston-green)' }}>
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--boston-green)' }}>Contact</h4>
        </div>
        
        {/* Contact Details - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2">
          {contactInfo.name && (
            <div className="bg-gray-50 px-2 py-1.5 rounded" style={{ backgroundColor: 'rgba(34, 139, 34, 0.05)' }}>
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--boston-green)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--boston-green)' }}>Name</span>
              </div>
              <span className="font-semibold text-gray-900 text-xs truncate block">{contactInfo.name}</span>
            </div>
          )}
          
          {contactInfo.email && (
            <a 
              href={`mailto:${contactInfo.email}`}
              className="bg-gray-50 px-2 py-1.5 rounded hover:shadow-md transition-all group"
              style={{ backgroundColor: 'rgba(34, 139, 34, 0.05)' }}
            >
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-3 h-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--boston-green)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--boston-green)' }}>Email</span>
              </div>
              <span className="font-medium text-gray-900 text-xs group-hover:underline transition-colors truncate block" style={{ color: 'var(--boston-green)' }}>{contactInfo.email}</span>
            </a>
          )}
          
          {contactInfo.phone && (
            <a 
              href={`tel:${contactInfo.phone}`}
              className="bg-gray-50 px-2 py-1.5 rounded hover:shadow-md transition-all group"
              style={{ backgroundColor: 'rgba(34, 139, 34, 0.05)' }}
            >
              <div className="flex items-center gap-1 mb-1">
                <svg className="w-3 h-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--boston-green)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--boston-green)' }}>Phone</span>
              </div>
              <span className="font-medium text-gray-900 text-xs group-hover:underline transition-colors truncate block" style={{ color: 'var(--boston-green)' }}>{contactInfo.phone}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// System Info Card Component
interface SystemInfoCardProps {
  source: string;
  language: string | null | undefined;
  timestamp: string | null;
  hasContact?: boolean;
}

function SystemInfoCard({ source, language, timestamp, hasContact = false }: SystemInfoCardProps) {
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className={`${hasContact ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-lg p-3 border border-gray-300 shadow-sm`}>
      <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        System
      </h4>
      <div className="space-y-1.5 text-xs">
        <div>
          <span className="text-gray-500">Source:</span>
          <span className="font-medium text-gray-900 ml-1 truncate block">{source}</span>
        </div>
        {language && (
          <div>
            <span className="text-gray-500">Lang:</span>
            <span className="font-medium text-gray-900 ml-1">{language.toUpperCase()}</span>
          </div>
        )}
        <div>
          <span className="text-gray-500">Time:</span>
          <span className="font-medium text-gray-900 ml-1 text-[11px]">{formatDate(timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackTable({ refreshTrigger }: FeedbackTableProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await api.getAllFeedback(50, 0);
      setFeedbacks(response.feedbacks);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching feedbacks:", err);
      setError("Failed to load feedback data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [refreshTrigger]);

  const getSentimentStyle = (score: number | null) => {
    if (score === null) return { color: '#6b7280' };
    if (score > 0.3) return { color: 'var(--sentiment-positive)' };
    if (score < -0.3) return { color: 'var(--sentiment-negative)' };
    return { color: 'var(--sentiment-neutral)' };
  };

  const getSentimentLabel = (score: number | null): string => {
    if (score === null) return "Unknown";
    if (score > 0.3) return "Positive";
    if (score < -0.3) return "Negative";
    return "Neutral";
  };

  const getSentimentIcon = (score: number | null): string => {
    if (score === null) return "○";
    if (score > 0.3) return "●";
    if (score < -0.3) return "●";
    return "●";
  };

  const getStatusBadgeStyle = (status: string) => {
    const statusColors: { [key: string]: string } = {
      New: "var(--status-new)",
      Routed: "var(--status-routed)",
      Acknowledged: "var(--status-acknowledged)",
      "In Progress": "var(--status-in-progress)",
      Updated: "var(--status-updated)",
      Closed: "var(--status-closed)",
    };
    
    return statusColors[status] ? { backgroundColor: statusColors[status] } : {};
  };

  const getUrgencyStyle = (urgency: string | null) => {
    if (!urgency) return {};
    const colors: { [key: string]: string } = {
      Low: "var(--urgency-low)",
      Medium: "var(--urgency-medium)",
      High: "var(--urgency-high)",
    };
    return colors[urgency] ? { backgroundColor: colors[urgency] } : {};
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRelativeTime = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString).split(',')[0];
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllRows = () => {
    if (expandedRows.size === feedbacks.length) {
      // All rows are expanded, collapse all
      setExpandedRows(new Set());
    } else {
      // Not all rows are expanded, expand all
      setExpandedRows(new Set(feedbacks.map(f => f.feedback_id)));
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderBottomColor: 'var(--boston-optimistic-blue)' }}></div>
        <p className="text-gray-600 font-medium">Loading feedback data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 border border-red-200">
        <div className="flex items-center gap-3" style={{ color: 'var(--boston-charles-blue)' }}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
        <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-gray-600 font-medium text-lg">No feedback data available</p>
        <p className="text-gray-500 text-sm mt-2">Submit some feedback to see it here</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200" style={{ background: 'linear-gradient(to right, rgba(24, 113, 189, 0.05), rgba(79, 156, 235, 0.05))' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Feedback Database</h3>
            <p className="text-sm text-gray-600 mt-1">
              {feedbacks.length} records from PostgreSQL
            </p>
          </div>
          <button
            onClick={fetchFeedbacks}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-all"
            style={{ backgroundColor: 'var(--boston-optimistic-blue)' }}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Time
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Issue Summary
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-36">
                Department
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-28">
                Impact
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">
                Sentiment
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                Urgency
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">
                <button
                  onClick={toggleAllRows}
                  className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 transition-all"
                  style={{ color: 'var(--boston-optimistic-blue)' }}
                  title={expandedRows.size === feedbacks.length ? "Collapse all rows" : "Expand all rows"}
                >
                  {expandedRows.size === feedbacks.length ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {feedbacks.map((feedback) => (
              <>
                <tr 
                  key={feedback.feedback_id} 
                  className={`transition-all ${
                    expandedRows.has(feedback.feedback_id)
                      ? 'border-l-4 border-r-4 border-b-2 shadow-lg' 
                      : 'hover:bg-blue-50'
                  }`}
                  style={{
                    backgroundColor: expandedRows.has(feedback.feedback_id) ? 'rgba(24, 113, 189, 0.05)' : undefined,
                    borderLeftColor: expandedRows.has(feedback.feedback_id) ? 'var(--boston-optimistic-blue)' : undefined,
                    borderRightColor: expandedRows.has(feedback.feedback_id) ? 'var(--boston-optimistic-blue)' : undefined,
                    borderBottomColor: expandedRows.has(feedback.feedback_id) ? 'rgba(24, 113, 189, 0.2)' : undefined
                  }}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-gray-900">
                        {getRelativeTime(feedback.timestamp_submitted)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {feedback.timestamp_submitted ? new Date(feedback.timestamp_submitted).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </span>
                      {feedback.followup_opt_in && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold" title="Contact info available" style={{ color: 'var(--boston-green)' }}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                          </svg>
                          Contact
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 max-w-md">
                      <div className="flex items-center gap-2 flex-wrap">
                        {feedback.permit_type && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-white rounded" style={{ backgroundColor: 'var(--boston-optimistic-blue)' }}>
                            {feedback.permit_type}
                          </span>
                        )}
                        {feedback.language && feedback.language !== 'en' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded" style={{ backgroundColor: '#ddd6fe', color: '#6b21a8' }}>
                            {feedback.language.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {feedback.ai_summary ? (
                        <p className="text-sm text-gray-900 line-clamp-2">
                          {feedback.ai_summary}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {feedback.issue_description}
                        </p>
                      )}
                      {feedback.category && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <span className="font-medium">{feedback.category}</span>
                          {feedback.subcategory && (
                            <>
                              <span>•</span>
                              <span>{feedback.subcategory}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {feedback.department_predicted || <span className="text-gray-400">Unassigned</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {feedback.impact_type && feedback.impact_type.length > 0 ? (
                        feedback.impact_type.slice(0, 2).map((impact, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded"
                    style={{ backgroundColor: 'var(--boston-gray-light)', color: 'var(--boston-optimistic-blue)' }}
                          >
                            {impact}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                      {feedback.impact_type && feedback.impact_type.length > 2 && (
                        <span className="text-xs text-gray-500 font-medium">
                          +{feedback.impact_type.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-lg" style={getSentimentStyle(feedback.sentiment_score)}>
                        {getSentimentIcon(feedback.sentiment_score)}
                      </span>
                      <span className="text-xs font-medium" style={getSentimentStyle(feedback.sentiment_score)}>
                        {getSentimentLabel(feedback.sentiment_score)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {feedback.urgency_level ? (
                      <span className="text-white rounded-full px-2.5 py-1 text-xs font-bold" style={getUrgencyStyle(feedback.urgency_level)}>
                        {feedback.urgency_level}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="text-white rounded-full px-2.5 py-1 text-xs font-semibold" style={getStatusBadgeStyle(feedback.status)}>
                      {feedback.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => toggleRow(feedback.feedback_id)}
                      className={`font-medium inline-flex items-center justify-center w-8 z-10 h-8 rounded-lg transition-all ${
                        expandedRows.has(feedback.feedback_id)
                          ? 'text-white shadow-lg'
                          : 'hover:shadow-xl'
                      }`}
                      style={{
                        backgroundColor: expandedRows.has(feedback.feedback_id) ? 'var(--boston-optimistic-blue)' : 'transparent',
                        color: expandedRows.has(feedback.feedback_id) ? 'white' : 'var(--boston-optimistic-blue)'
                      }}
                      title={expandedRows.has(feedback.feedback_id) ? "Hide details" : "View details"}
                    >
                      {expandedRows.has(feedback.feedback_id) ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
                
                {/* Expanded Row Details */}
                {expandedRows.has(feedback.feedback_id) && (
                  <tr className="" style={{ backgroundColor: 'rgba(24, 113, 189, 0.03)'}}>
                    <td colSpan={8} className="px-6 py-4 border-t-0">
                      <div className="space-y-3">
                        {/* First Row - Original Feedback and Classification */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                          <OriginalFeedbackCard description={feedback.issue_description} />
                          <ClassificationCard 
                            permitType={feedback.permit_type}
                            category={feedback.category}
                            subcategory={feedback.subcategory}
                            department={feedback.department_predicted}
                            impactTypes={feedback.impact_type}
                          />
                        </div>

                        {/* Second Row - AI Summary, System Info, and Contact Info */}
                        {feedback.ai_summary && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                            <AISummaryCard 
                              summary={feedback.ai_summary}
                              hasContact={!!(feedback.followup_opt_in && feedback.user_contact_info)}
                            />
                            <SystemInfoCard 
                              source={feedback.feedback_source}
                              language={feedback.language}
                              timestamp={feedback.timestamp_submitted}
                              hasContact={!!(feedback.followup_opt_in && feedback.user_contact_info)}
                            />
                            {feedback.followup_opt_in && feedback.user_contact_info && (
                              <ContactInfoCard contactInfo={feedback.user_contact_info} />
                                      )}
                                    </div>
                        )}

                        {/* System Info if no AI Summary */}
                        {!feedback.ai_summary && (
                          <SystemInfoCard 
                            source={feedback.feedback_source}
                            language={feedback.language}
                            timestamp={feedback.timestamp_submitted}
                            hasContact={false}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <p className="text-sm text-gray-600 text-center">
          Showing {feedbacks.length} most recent feedback entries
        </p>
      </div>
    </div>
  );
}
