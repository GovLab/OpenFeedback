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
import { getStaffToken, STAFF_LOGOUT_EVENT, STAFF_SESSION_EXPIRED_EVENT } from "@/lib/http";
import SessionExpiryNotice from "@/components/SessionExpiryNotice";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type TabType = "dashboard" | "config";

const TABS: { id: TabType; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "config", label: "System Configuration" },
];

type SessionState = "checking" | "signedOut" | "signedIn" | "expired";

export default function GovtPage() {
  // "checking" until sessionStorage is read, so the login form doesn't flash
  const [session, setSession] = useState<SessionState>("checking");

  useEffect(() => {
    setSession(getStaffToken() ? "signedIn" : "signedOut");
    const handleLogout = () => setSession("signedOut");
    const handleExpired = () => setSession("expired");
    window.addEventListener(STAFF_LOGOUT_EVENT, handleLogout);
    window.addEventListener(STAFF_SESSION_EXPIRED_EVENT, handleExpired);
    return () => {
      window.removeEventListener(STAFF_LOGOUT_EVENT, handleLogout);
      window.removeEventListener(STAFF_SESSION_EXPIRED_EVENT, handleExpired);
    };
  }, []);

  if (session === "checking") return null;
  if (session === "signedOut") return <StaffLogin onLoggedIn={() => setSession("signedIn")} />;

  // When the session ends, the dashboard stays mounted behind a sign-in dialog,
  // so unsaved configuration edits are still there after signing in again
  const expired = session === "expired";
  return (
    <>
      <div inert={expired || undefined}>
        <GovtDashboard />
      </div>
      {expired && <StaffLogin dialog onLoggedIn={() => setSession("signedIn")} />}
    </>
  );
}

function GovtDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  useDocumentTitle(activeTab === "config" ? "System configuration" : "Dashboard");
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
      {/* Skip link is the first stop, so keyboard users can jump past the navigation and header */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#091F2F] focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-[#1871bd]"
      >
        Skip to main content
      </a>
      <Navigation />
      <DashboardHeader />

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8">
        <SessionExpiryNotice />
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
    </div>
  );
}
