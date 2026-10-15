"use client";

import { useState } from "react";
import FeedbackForm from "@/components/FeedbackForm";
import SuccessMessage from "@/components/SuccessMessage";
import Navigation from "@/components/Navigation";
import PrivacyNotice from "@/components/PrivacyNotice";
import { topic } from "@/lib/topic";

export default function Home() {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleFeedbackSubmitted = () => {
    setShowSuccess(true);
    // Auto-hide success message after 10 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 10000);
  };

  return (
    <div className="min-h-screen min-w-[320px] bg-[var(--boston-gray-light)]">
      {/* Main Content */}
      <main className="mx-auto min-w-[320px] max-w-4xl px-4 pt-20 pb-8 sm:py-10">
        {/* Minimal Header - centered and clean */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl tracking-tight text-[#091F2F] sm:text-4xl">
            {topic.appTitle}
          </h1>
          <p className="text-base text-slate-600">
            We want to hear from you!
          </p>
        </div>

        {/* Form - The Hero */}
        <FeedbackForm 
          onFeedbackSubmitted={handleFeedbackSubmitted} 
        />

        {/* Success Message */}
        {showSuccess && <SuccessMessage onClose={() => setShowSuccess(false)} />}

        <PrivacyNotice />

      </main>

      {/* Navigation */}
      <Navigation />
    </div>
  );
}
