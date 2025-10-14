'use client';

import { useState, useEffect } from 'react';
import FeedbackForm from '@/components/FeedbackForm';
import GraphVisualization from '@/components/GraphVisualization';
import StatsDisplay from '@/components/StatsDisplay';
import { api, GraphData, Stats } from '@/lib/api';

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], relationships: [] });
  const [stats, setStats] = useState<Stats>({ total_feedback: 0, categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [graph, statsData] = await Promise.all([
        api.getGraph(),
        api.getStats()
      ]);
      setGraphData(graph);
      setStats(statsData);
      setError(null);
    } catch (err) {
      setError('Failed to load data. Make sure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Feedback Classification System
          </h1>
          <p className="text-gray-600 mt-2">
            Submit feedback to see it classified and visualized in real-time
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <FeedbackForm onFeedbackSubmitted={fetchData} />
          </div>
          <div>
            <StatsDisplay stats={stats} />
          </div>
        </div>

        <div>
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-600">Loading graph data...</p>
            </div>
          ) : (
            <GraphVisualization data={graphData} />
          )}
        </div>
      </main>
    </div>
  );
}
