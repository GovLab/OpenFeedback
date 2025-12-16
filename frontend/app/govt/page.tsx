"use client";

import { useState, useEffect } from "react";
import FileUploadForm from "@/components/FileUploadForm";
import GraphVisualization from "@/components/GraphVisualization";
import StatsDisplay from "@/components/StatsDisplay";
import FeedbackTable from "@/components/TableVisualization";
import Navigation from "@/components/Navigation";
import SystemConfigManager from "@/components/SystemConfigManager";
import { api, GraphData, Stats } from "@/lib/api";

type TabType = "dashboard" | "config";

export default function GovtDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
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
  const [hoveredCards, setHoveredCards] = useState<{ [key: string]: boolean }>({
    overview: false,
    batchUpload: false,
    networkGraph: false,
  });

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
        {/* Tab Navigation */}
        <div className="mb-6 border-b" style={{ borderColor: 'var(--boston-gray-medium)' }}>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className="px-6 py-3 font-medium text-sm transition-colors border-b-2"
              style={
                activeTab === "dashboard"
                  ? { borderColor: 'var(--boston-optimistic-blue)', color: 'var(--boston-optimistic-blue)' }
                  : { borderColor: 'transparent', color: 'var(--boston-gray-dark)' }
              }
              onMouseEnter={(e) => {
                if (activeTab !== "dashboard") {
                  e.currentTarget.style.color = 'var(--boston-charles-blue)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== "dashboard") {
                  e.currentTarget.style.color = 'var(--boston-gray-dark)';
                }
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className="px-6 py-3 font-medium text-sm transition-colors border-b-2"
              style={
                activeTab === "config"
                  ? { borderColor: 'var(--boston-optimistic-blue)', color: 'var(--boston-optimistic-blue)' }
                  : { borderColor: 'transparent', color: 'var(--boston-gray-dark)' }
              }
              onMouseEnter={(e) => {
                if (activeTab !== "config") {
                  e.currentTarget.style.color = 'var(--boston-charles-blue)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== "config") {
                  e.currentTarget.style.color = 'var(--boston-gray-dark)';
                }
              }}
            >
              System Configuration
            </button>
          </div>
        </div>

        {activeTab === "config" ? (
          <SystemConfigManager />
        ) : (
          <>
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
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-gray-900">Overview</h2>
            <div 
              className="relative"
              onMouseEnter={() => handleMouseEnter('overview')}
              onMouseLeave={() => handleMouseLeave('overview')}
            >
              <button
                className="w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md cursor-help"
                style={{
                  background: `linear-gradient(to bottom right, var(--boston-optimistic-blue), var(--boston-charles-blue))`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `linear-gradient(to bottom right, var(--boston-charles-blue), var(--boston-blue-dark))`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `linear-gradient(to bottom right, var(--boston-optimistic-blue), var(--boston-charles-blue))`;
                }}
                aria-label="Show guide"
              >
                ?
              </button>
              {hoveredCards.overview && (
                <div className="instruction-modal absolute left-full ml-3 -top-2 w-96 z-50 animate-fadeIn transition-opacity duration-200">
                  <div className="absolute left-0 top-4 w-0 h-0 border-t-[10px] border-b-[10px] border-r-[10px] border-transparent -ml-[11px]" style={{ borderRightColor: 'var(--instruction-modal-border)' }}></div>
                  <div className="absolute left-0 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent -ml-2" style={{ borderRightColor: 'var(--instruction-modal-bg)' }}></div>
                  <h3 className="font-bold text-blue-900 mb-3 text-base">How to use Overview</h3>
                  <ul className="space-y-2.5 text-sm text-gray-700 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span>View the total number of feedback submissions received.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span>Check how many items fall under each category (e.g., Process Issues, Communication Problems, Equity Concerns).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span>Use this section to understand high-level trends and where most feedback is coming from.</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          <StatsDisplay stats={stats} />
        </div>

        {/* File Upload Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-gray-900">Batch Data Upload</h2>
            <div 
              className="relative"
              onMouseEnter={() => handleMouseEnter('batchUpload')}
              onMouseLeave={() => handleMouseLeave('batchUpload')}
            >
              <button
                className="w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md cursor-help"
                style={{
                  background: `linear-gradient(to bottom right, var(--boston-optimistic-blue), var(--boston-charles-blue))`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `linear-gradient(to bottom right, var(--boston-charles-blue), var(--boston-blue-dark))`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `linear-gradient(to bottom right, var(--boston-optimistic-blue), var(--boston-charles-blue))`;
                }}
                aria-label="Show guide"
              >
                ?
              </button>
              {hoveredCards.batchUpload && (
                <div className="instruction-modal absolute left-full ml-3 -top-2 w-[28rem] z-50 animate-fadeIn transition-opacity duration-200">
                  <div className="absolute left-0 top-4 w-0 h-0 border-t-[10px] border-b-[10px] border-r-[10px] border-transparent -ml-[11px]" style={{ borderRightColor: 'var(--instruction-modal-border)' }}></div>
                  <div className="absolute left-0 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent -ml-2" style={{ borderRightColor: 'var(--instruction-modal-bg)' }}></div>
                  <h3 className="font-bold text-blue-900 mb-3 text-base">How to use Batch Data Upload</h3>
                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">Use this tool when you need to import feedback in bulk from reports, emails, or other sources.</p>
                  <div className="space-y-3 text-sm text-gray-700">
                    <div>
                      <p className="font-semibold mb-2 text-gray-900">Steps:</p>
                      <ol className="space-y-2 ml-1">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold flex-shrink-0">1.</span>
                          <span>Choose a file (PDF, TXT, or DOCX — up to 10 MB).</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold flex-shrink-0">2.</span>
                          <div>
                            <span>Select a processing option:</span>
                            <ul className="ml-4 mt-1 space-y-1">
                              <li className="flex items-start gap-2">
                                <span className="text-blue-400">•</span>
                                <span><strong>Process & Store</strong> → Uploads and saves data to the system.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-blue-400">•</span>
                                <span><strong>Classify Only</strong> → Tests the file without storing results.</span>
                              </li>
                            </ul>
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold flex-shrink-0">3.</span>
                          <span>Wait for confirmation that classification is complete.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold flex-shrink-0">4.</span>
                          <span>The data will appear automatically in your statistics and graphs.</span>
                        </li>
                      </ol>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 bg-blue-50 rounded-lg p-3">
                      <p className="font-semibold text-blue-900 flex items-center gap-1.5">
                        <span className="text-lg">💡</span>
                        <span>Tip:</span>
                      </p>
                      <p className="mt-1 text-gray-700">Files are automatically analyzed by AI to identify feedback categories and themes.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-gray-900">Feedback Network Graph</h2>
            <div 
              className="relative"
              onMouseEnter={() => handleMouseEnter('networkGraph')}
              onMouseLeave={() => handleMouseLeave('networkGraph')}
            >
              <button
                className="w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md cursor-help"
                style={{
                  background: `linear-gradient(to bottom right, var(--boston-optimistic-blue), var(--boston-charles-blue))`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `linear-gradient(to bottom right, var(--boston-charles-blue), var(--boston-blue-dark))`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `linear-gradient(to bottom right, var(--boston-optimistic-blue), var(--boston-charles-blue))`;
                }}
                aria-label="Show guide"
              >
                ?
              </button>
              {hoveredCards.networkGraph && (
                <div className="instruction-modal absolute left-full ml-3 -top-2 w-96 z-50 animate-fadeIn transition-opacity duration-200">
                  <div className="absolute left-0 top-4 w-0 h-0 border-t-[10px] border-b-[10px] border-r-[10px] border-transparent -ml-[11px]" style={{ borderRightColor: 'var(--instruction-modal-border)' }}></div>
                  <div className="absolute left-0 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent -ml-2" style={{ borderRightColor: 'var(--instruction-modal-bg)' }}></div>
                  <h3 className="font-bold text-blue-900 mb-3 text-base">How to use Feedback Network Graph</h3>
                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">Explore how feedback connects across categories and subtopics.</p>
                  <div className="space-y-3 text-sm text-gray-700">
                    <div>
                      <p className="font-semibold mb-2 text-gray-900">How to read it:</p>
                      <ul className="space-y-2 ml-1">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold mt-0.5">•</span>
                          <span><strong className="text-blue-600">Blue nodes</strong> = Individual feedback items</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 font-bold mt-0.5">•</span>
                          <span><strong className="text-green-600">Green nodes</strong> = Categories</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-500 font-bold mt-0.5">•</span>
                          <span><strong className="text-orange-600">Orange nodes</strong> = Subcategories</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold mb-2 text-gray-900">You can:</p>
                      <ul className="space-y-2 ml-1">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold mt-0.5">•</span>
                          <span>Click a node to highlight its connections.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold mt-0.5">•</span>
                          <span>Drag to pan across the visualization.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold mt-0.5">•</span>
                          <span>Use the zoom control to see more or less detail.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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
          </>
        )}
      </main>

      {/* Navigation */}
      <Navigation />
    </div>
  );
}

