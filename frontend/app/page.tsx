"use client";

import { useState } from "react";
import FeedbackForm from "@/components/FeedbackForm";
import SuccessMessage from "@/components/SuccessMessage";
import Navigation from "@/components/Navigation";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Share Your Feedback
          </h1>
          <p className="text-lg text-gray-600">
            We value your input and want to hear from you. Your feedback helps us improve our services and better serve the community.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Instructions Section */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            How to Submit Feedback
          </h2>
          <div className="space-y-4 text-gray-700">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Write your feedback</h3>
                <p className="text-sm">
                  Share your thoughts, suggestions, concerns, or compliments about our services. Be as specific as possible to help us understand your needs.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Answer follow-up questions (if any)</h3>
                <p className="text-sm">
                  Our system may ask you a few clarifying questions to better understand your feedback. This helps us categorize and address your input more effectively.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Submit and we'll take it from there</h3>
                <p className="text-sm">
                  Once submitted, your feedback will be reviewed by our team. We read every submission and use your input to guide our improvements.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Form */}
        <FeedbackForm 
          onFeedbackSubmitted={handleFeedbackSubmitted} 
          showClassificationResult={false}
        />

        {/* Success Message */}
        {showSuccess && <SuccessMessage onClose={() => setShowSuccess(false)} />}

        {/* Additional Info */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Privacy Notice</h3>
          <p className="text-sm text-blue-800">
            Your feedback is important to us. All submissions are reviewed and help inform our decision-making process. 
            We respect your privacy and handle all feedback confidentially.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>Thank you for taking the time to share your feedback with us.</p>
        </div>
      </footer>

      {/* Navigation */}
      <Navigation />
    </div>
  );
}
