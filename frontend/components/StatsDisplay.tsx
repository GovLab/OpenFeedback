'use client';

import { Stats } from '@/lib/api';
import { CARD, EYEBROW } from '@/components/ui/styles';
import { NODE_COLOR } from '@/components/graph/graphTheme';

interface StatsDisplayProps {
  stats: Stats;
}

// Total plus a per-category breakdown, drawn like the graph's distribution list
export default function StatsDisplay({ stats }: StatsDisplayProps) {
  const top = Math.max(1, ...stats.categories.map((c) => c.count));
  return (
    <div className={`${CARD} grid gap-6 p-6 md:grid-cols-[12rem_1fr] md:gap-8`}>
      <div className="md:border-r md:border-slate-200 md:pr-8">
        <p className={EYEBROW}>Total Feedback</p>
        <p className="font-ui mt-1 text-5xl font-bold text-[#091F2F] tabular-nums">{stats.total_feedback}</p>
      </div>

      <div>
        <h3 className={`${EYEBROW} mb-3`}>Categories</h3>
        {stats.categories.length === 0 ? (
          <p className="text-sm text-slate-600">No categories yet.</p>
        ) : (
          <ul className="grid gap-x-10 gap-y-3 lg:grid-cols-2">
            {stats.categories.map((cat) => (
              <li key={cat.category}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-800">{cat.category}</span>
                  <span className="font-ui inline-flex min-w-[2rem] justify-center rounded-full bg-[#1871bd] px-2 py-0.5 text-xs font-bold text-white tabular-nums">
                    {cat.count}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-100" aria-hidden="true">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${(cat.count / top) * 100}%`, backgroundColor: NODE_COLOR.Category }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
