"use client";
import { LogOut } from "lucide-react";
import { clearStaffToken } from "@/lib/http";
import { topic, showSampleDataNotice } from "@/lib/topic";

// Dark brand header. Right padding keeps the buttons clear of the fixed nav pill.
export function DashboardHeader() {
  return (
    <header className="bg-[#091F2F]">
      <div className="mx-auto max-w-7xl px-4 py-8 pr-28 sm:pr-32">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mb-2 text-2xl text-white sm:text-3xl">{topic.dashboardTitle}</h1>
            <p className="text-slate-200">
              Analyze submissions, identify recurring issues, and coordinate agency responses.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {showSampleDataNotice ? (
              <p
                className="font-ui flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1.5 text-sm font-semibold text-amber-100"
                title="This dashboard shows made-up feedback for demonstration"
              >
                <span className="h-2 w-2 rounded-full bg-amber-300" aria-hidden="true" />
                Sample Data
                <span className="sr-only">: this dashboard shows made-up feedback for demonstration</span>
              </p>
            ) : (
              <p className="font-ui flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-green-400" aria-hidden="true" />
                Live Data
              </p>
            )}
            <button
              type="button"
              onClick={clearStaffToken}
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm text-white transition-colors hover:bg-white/20 focus-visible:outline-white"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
