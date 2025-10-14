'use client';

import { Stats } from '@/lib/api';

interface StatsDisplayProps {
  stats: Stats;
}

export default function StatsDisplay({ stats }: StatsDisplayProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Statistics</h2>
      
      <div className="space-y-4">
        <div className="border-b pb-3">
          <p className="text-sm text-gray-600">Total Feedback</p>
          <p className="text-3xl font-bold text-blue-600">{stats.total_feedback}</p>
        </div>

        {stats.categories.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Categories</h3>
            <div className="space-y-2">
              {stats.categories.map((cat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-700">{cat.category}</span>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
