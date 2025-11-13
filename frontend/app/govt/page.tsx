"use client";

import { useState, useEffect } from "react";
import FileUploadForm from "@/components/FileUploadForm";
import GraphVisualization from "@/components/GraphVisualization";
import StatsDisplay from "@/components/StatsDisplay";
import FeedbackTable from "@/components/TableVisualization";
import Navigation from "@/components/Navigation";
import { api, GraphData, Stats } from "@/lib/api";

export default function GovtDashboard() {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    relationships: [],
  });
  const [stats, setStats] = useState<Stats>({
    total_feedback: 0,
    categories: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({
    overview: true,  // Show Overview guide by default
    batchUpload: false,
    networkGraph: false,
    publicFeedback: false,
  });
  const [hoveredCards, setHoveredCards] = useState<{ [key: string]: boolean }>({
    batchUpload: false,
    networkGraph: false,
  });

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleMouseEnter = (cardId: string) => {
    setHoveredCards(prev => ({
      ...prev,
      [cardId]: true
    }));
  };

  const handleMouseLeave = (cardId: string) => {
    setHoveredCards(prev => ({
      ...prev,
      [cardId]: false
    }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log("Starting to fetch data from backend...");

      const [graph, statsData] = await Promise.all([
        api.getGraph(),
        api.getStats(),
      ]);

      console.log("Graph data received:", graph);
      console.log("Stats data received:", statsData);

      setGraphData(graph);
      setStats(statsData);
      setError(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error("Error fetching data:", {
        message: err.message,
        response: err.response?.data,
        request: err.request,
        config: err.config,
      });

      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        "Failed to load data. Make sure the backend is running.";
      setError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Permit Feedback Analytics
              </h1>
              <p className="text-slate-200">
                Analyze submissions, identify recurring issues, and coordinate agency responses.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white text-sm font-medium">Live Data</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Overview</h2>
            <button
              onClick={() => toggleCard('overview')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${expandedCards.overview ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {expandedCards.overview ? 'Hide Guide' : 'Show Guide'}
            </button>
          </div>
          {expandedCards.overview && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">How to use Overview</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• View the total number of feedback submissions received.</li>
                <li>• Check how many items fall under each category (e.g., Process Issues, Communication Problems, Equity Concerns).</li>
                <li>• Use this section to understand high-level trends and where most feedback is coming from.</li>
              </ul>
            </div>
          )}
          <StatsDisplay stats={stats} />
        </div>

        {/* File Upload Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">Batch Data Upload</h2>
              <div 
                className="relative"
                onMouseEnter={() => handleMouseEnter('batchUpload')}
                onMouseLeave={() => handleMouseLeave('batchUpload')}
              >
                <button
                  className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center text-xs font-semibold transition-colors cursor-help"
                  aria-label="Show guide"
                >
                  ?
                </button>
              </div>
            </div>
            <button
              onClick={() => toggleCard('batchUpload')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${expandedCards.batchUpload ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {expandedCards.batchUpload ? 'Hide Guide' : 'Show Guide'}
            </button>
          </div>
          {(expandedCards.batchUpload || hoveredCards.batchUpload) && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">How to use Batch Data Upload</h3>
              <p className="text-sm text-blue-800 mb-3">Use this tool when you need to import feedback in bulk from reports, emails, or other sources.</p>
              <div className="space-y-3 text-sm text-blue-800">
                <div>
                  <p className="font-medium mb-1">Steps:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Choose a file (PDF, TXT, or DOCX — up to 10 MB).</li>
                    <li>Select a processing option:
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li><strong>Process & Store</strong> → Uploads and saves data to the system.</li>
                        <li><strong>Classify Only</strong> → Tests the file without storing results.</li>
                      </ul>
                    </li>
                    <li>Wait for confirmation that classification is complete.</li>
                    <li>The data will appear automatically in your statistics and graphs.</li>
                  </ol>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <p className="font-medium">💡 Tip:</p>
                  <p>Files are automatically analyzed by AI to identify feedback categories and themes.</p>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <FileUploadForm onFeedbackSubmitted={fetchData} />
            </div>
            <div>
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  File Upload Guide
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p>Supported: PDF, TXT, DOCX</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p>Maximum size: 10MB per file</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p>Automated text extraction and classification</p>
                  </div>
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <p className="font-medium text-gray-800 mb-2">Processing Options:</p>
                    <ul className="space-y-1.5 ml-2">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span><strong>Process & Store:</strong> Save results to database</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span><strong>Classify Only:</strong> Test without storing</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Graph Visualization */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">Feedback Network Graph</h2>
              <div 
                className="relative"
                onMouseEnter={() => handleMouseEnter('networkGraph')}
                onMouseLeave={() => handleMouseLeave('networkGraph')}
              >
                <button
                  className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center text-xs font-semibold transition-colors cursor-help"
                  aria-label="Show guide"
                >
                  ?
                </button>
              </div>
            </div>
            <button
              onClick={() => toggleCard('networkGraph')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${expandedCards.networkGraph ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {expandedCards.networkGraph ? 'Hide Guide' : 'Show Guide'}
            </button>
          </div>
          {(expandedCards.networkGraph || hoveredCards.networkGraph) && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">How to use Feedback Network Graph</h3>
              <p className="text-sm text-blue-800 mb-3">Explore how feedback connects across categories and subtopics.</p>
              <div className="space-y-3 text-sm text-blue-800">
                <div>
                  <p className="font-medium mb-2">How to read it:</p>
                  <ul className="space-y-1 ml-2">
                    <li>• <strong>Blue nodes</strong> = Individual feedback items</li>
                    <li>• <strong>Green nodes</strong> = Categories</li>
                    <li>• <strong>Orange nodes</strong> = Subcategories</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">You can:</p>
                  <ul className="space-y-1 ml-2">
                    <li>• Click a node to highlight its connections.</li>
                    <li>• Drag to pan across the visualization.</li>
                    <li>• Use the zoom control to see more or less detail.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading graph data...</p>
            </div>
          ) : (
            <GraphVisualization data={graphData} />
          )}
        </div>

        {/* Feedback Table */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Feedback</h2>
          <FeedbackTable refreshTrigger={refreshTrigger} />
        </div>

        {/* Public Feedback Switch Guide */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Navigation Guide</h2>
            <button
              onClick={() => toggleCard('publicFeedback')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${expandedCards.publicFeedback ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {expandedCards.publicFeedback ? 'Hide Guide' : 'Show Guide'}
            </button>
          </div>
          {expandedCards.publicFeedback && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">Public Feedback Switch</h3>
              <p className="text-sm text-blue-800 mb-2">Use the navigation at the bottom to switch between:</p>
              <ul className="space-y-2 text-sm text-blue-800 ml-2">
                <li>• <strong>Public Feedback</strong> → What residents submit</li>
                <li>• <strong>Dashboard View</strong> → Internal analytics and management tools</li>
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>Government Dashboard - Feedback Management System</p>
        </div>
      </footer>

      {/* Navigation */}
      <Navigation />
    </div>
  );
}

