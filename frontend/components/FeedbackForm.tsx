'use client';

import { useState } from 'react';
import { api, ClassifiedFeedback } from '@/lib/api';

interface FeedbackFormProps {
  onFeedbackSubmitted: () => void;
}

export default function FeedbackForm({ onFeedbackSubmitted }: FeedbackFormProps) {
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifiedFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      setError('Please enter some feedback');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const classified = await api.submitFeedback({ text: feedback });
      setResult(classified);
      setFeedback('');
      onFeedbackSubmitted();
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Submit Feedback</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
            Your Feedback
          </label>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            rows={4}
            placeholder="Enter your feedback here..."
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded-md">
          <h3 className="font-semibold text-green-800 mb-2">Feedback Classified!</h3>
          <div className="text-sm text-green-700 space-y-2">
            {result.category_map && Object.entries(result.category_map).map(([category, subcategories]) => (
              <div key={category}>
                <p><strong>{category}:</strong> {subcategories.join(', ')}</p>
              </div>
            ))}
            <p><strong>Sentiment:</strong> {result.sentiment}</p>
          </div>
        </div>
      )}
    </div>
  );
}
