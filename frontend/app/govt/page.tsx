"use client";

import { useState, useEffect } from "react";
import FileUploadForm from "@/components/FileUploadForm";
import GraphVisualization from "@/components/GraphVisualization";
import StatsDisplay from "@/components/StatsDisplay";
import FeedbackTable from "@/components/TableVisualization";
import Navigation from "@/components/Navigation";
import SystemConfigManager from "@/components/SystemConfigManager";
import StaffLogin from "@/components/StaffLogin";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BatchUploadHelp, GraphHelp, OverviewHelp } from "@/components/dashboard/HelpContent";
import { UploadGuide } from "@/components/dashboard/UploadGuide";
import { HelpBubble } from "@/components/ui/HelpBubble";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StateMessage } from "@/components/ui/StateMessage";
import { Tabs, tabPanelProps } from "@/components/ui/Tabs";
import { api, GraphData, Stats } from "@/lib/api";
import { getStaffToken, STAFF_LOGOUT_EVENT } from "@/lib/http";

type TabType = "dashboard" | "config";

const TABS: { id: TabType; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "config", label: "System Configuration" },
];

export default function GovtPage() {
  // null until we've checked sessionStorage, so the login form doesn't flash
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setIsLoggedIn(Boolean(getStaffToken()));
    const handleLogout = () => setIsLoggedIn(false);
    window.addEventListener(STAFF_LOGOUT_EVENT, handleLogout);
    return () => window.removeEventListener(STAFF_LOGOUT_EVENT, handleLogout);
  }, []);

  if (isLoggedIn === null) return null;
  if (!isLoggedIn) return <StaffLogin onLoggedIn={() => setIsLoggedIn(true)} />;
  return <GovtDashboard />;
}

function GovtDashboard() {
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [graph, statsData] = await Promise.all([
        api.getGraph(),
        api.getStats(),
      ]);
      setGraphData(graph);
      setStats(statsData);
      setError(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error("Error fetching data:", {
        message: err.message,
        response: err.response?.data,
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
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Tabs
          tabs={TABS}
          active={activeTab}
          onChange={setActiveTab}
          idPrefix="govt"
          label="Dashboard sections"
          className="mb-8 border-b border-slate-200"
        />

        {activeTab === "config" ? (
          <div {...tabPanelProps("govt", "config")} className="focus:outline-none">
            <SystemConfigManager />
          </div>
        ) : (
          <div {...tabPanelProps("govt", "dashboard")} className="space-y-10 focus:outline-none">
            {error && (
              <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[var(--text-danger)]">
                <span className="font-medium">{error}</span>
                <button
                  type="button"
                  onClick={fetchData}
                  className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-[var(--text-danger)] hover:bg-red-50"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Stats Overview */}
            <section aria-labelledby="overview-title">
              <SectionHeader
                id="overview-title"
                title="Overview"
                help={<HelpBubble title="How to use Overview"><OverviewHelp /></HelpBubble>}
              />
              <StatsDisplay stats={stats} />
            </section>

            {/* File Upload Section */}
            <section aria-labelledby="upload-title">
              <SectionHeader
                id="upload-title"
                title="Batch Data Upload"
                help={<HelpBubble title="How to use Batch Data Upload" width="lg"><BatchUploadHelp /></HelpBubble>}
              />
              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <FileUploadForm onFeedbackSubmitted={fetchData} />
                </div>
                <UploadGuide />
              </div>
            </section>

            {/* Graph Visualization */}
            <section aria-labelledby="graph-title">
              <SectionHeader
                id="graph-title"
                title="Feedback Network Graph"
                help={<HelpBubble title="How to use Feedback Network Graph"><GraphHelp /></HelpBubble>}
              />
              {loading ? (
                <StateMessage kind="loading" title="Loading graph data..." />
              ) : (
                <GraphVisualization data={graphData} />
              )}
            </section>

            {/* Feedback Table */}
            <section aria-labelledby="recent-title">
              <SectionHeader id="recent-title" title="Recent Feedback" />
              <FeedbackTable refreshTrigger={refreshTrigger} />
            </section>
          </div>
        )}
      </main>

      {/* Navigation */}
      <Navigation />
    </div>
  );
}
