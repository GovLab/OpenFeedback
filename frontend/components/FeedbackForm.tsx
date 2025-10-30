'use client';

import { useState } from 'react';
import { api, ClassifiedFeedback, ConversationMessage } from '@/lib/api';
import ChatbotSidebar from './ChatbotSidebar';

interface FeedbackFormProps {
  onFeedbackSubmitted: () => void;
  showClassificationResult?: boolean;
}

export default function FeedbackForm({ onFeedbackSubmitted, showClassificationResult = true }: FeedbackFormProps) {
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifiedFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Chatbot state
  const [showChatbot, setShowChatbot] = useState(false);
  const [originalFeedback, setOriginalFeedback] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [hasBeenEnhanced, setHasBeenEnhanced] = useState(false);

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
      // Use intelligent agent to check feedback quality (only if not already enhanced)
      if (!hasBeenEnhanced) {
        const agentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8003'}/api/feedback-agent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            original_feedback: feedback,
            category_map: {},
            conversation_history: []
          })
        });
        
        if (!agentResponse.ok) throw new Error('Agent check failed');
        const agentData = await agentResponse.json();
        
        if (agentData.needs_followup) {
          // Low quality - show chatbot sidebar with agent's first question
          setOriginalFeedback(feedback);
          setConversationHistory([{
            role: 'assistant',
            content: agentData.message
          }]);
          setQuestionCount(1);
          setCanSkip(false);
          setShowChatbot(true);
          setLoading(false);
          return;
        }
      }
      
      // High quality or already enhanced - classify and submit to DB
      const submitted = await api.submitFeedback({ text: feedback });
      setResult(submitted);
      setFeedback('');
      setHasBeenEnhanced(false); // Reset for next submission
      onFeedbackSubmitted();
      setLoading(false);
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };
  
  const handleChatSubmit = async (userInput: string) => {
    if (!userInput.trim()) return;
    
    setChatLoading(true);
    
    // Add user message to history
    const newHistory = [
      ...conversationHistory,
      { role: 'user', content: userInput }
    ];
    setConversationHistory(newHistory);
    
    try {
      const newQuestionCount = questionCount + 1;
      setQuestionCount(newQuestionCount);
      
      // Stop after 5 questions max
      if (newQuestionCount >= 5) {
        await finishConversation();
        return;
      }
      
      // Call intelligent agent with full conversation history
      const agentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8003'}/api/feedback-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_feedback: originalFeedback,
          category_map: {},
          conversation_history: newHistory
        })
      });
      
      if (!agentResponse.ok) throw new Error('Agent error');
      const agentData = await agentResponse.json();
      
      // Add agent's response to history
      const updatedHistory = [
        ...newHistory,
        { role: 'assistant', content: agentData.message }
      ];
      setConversationHistory(updatedHistory);
      
      // Update skip button based on agent's quality assessment
      if (newQuestionCount >= 2) {
        setCanSkip(!agentData.needs_followup);
      }
      
      // If agent says quality is sufficient, finish conversation
      if (!agentData.needs_followup) {
        setTimeout(() => finishConversation(), 1500);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const finishConversation = async () => {
    // Build enhanced feedback text from conversation
    const conversationText = conversationHistory
      .filter(msg => msg.role === 'user') // Only user responses
      .map(msg => msg.content)
      .join(' ');
    
    const enhancedFeedback = `${originalFeedback}\n\nAdditional details: ${conversationText}`;
    
    // Close chatbot and put enhanced text back in textarea
    setShowChatbot(false);
    setFeedback(enhancedFeedback);
    setHasBeenEnhanced(true); // Mark as enhanced to skip chatbot on resubmit
    
    // Reset chatbot state
    setConversationHistory([]);
    setOriginalFeedback('');
    setQuestionCount(0);
    setCanSkip(false);
  };

  const handleSkipConversation = () => {
    finishConversation();
  };

  const handleEditFeedback = () => {
    setFeedback(originalFeedback);
    setShowChatbot(false);
    setConversationHistory([]);
    setOriginalFeedback('');
    setQuestionCount(0);
    setCanSkip(false);
    setHasBeenEnhanced(false); // Reset enhancement flag
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full min-w-[280px]">
      {/* Main Feedback Form */}
      <div className={`flex-1 bg-white rounded-lg shadow-md p-4 sm:p-6 transition-opacity duration-300 min-w-[280px] ${showChatbot ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Submit Feedback</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">
                Your Feedback
              </label>
              {hasBeenEnhanced && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  ✓ Enhanced with details
                </span>
              )}
            </div>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                // If user manually edits enhanced feedback, keep the flag but allow changes
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 resize-y max-h-96"
              rows={hasBeenEnhanced ? 6 : 4}
              placeholder="Enter your feedback here..."
              disabled={loading || showChatbot}
            />
            {hasBeenEnhanced && (
              <p className="text-xs text-gray-600 mt-2">
                💡 Your feedback has been enhanced with additional details. Review and submit when ready.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || showChatbot}
            className={`w-full min-w-[200px] py-2 px-4 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${
              hasBeenEnhanced 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? 'Submitting...' : hasBeenEnhanced ? '✓ Submit Enhanced Feedback' : 'Submit Feedback'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {showClassificationResult && result && (
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

      {/* Chatbot Sidebar */}
      <ChatbotSidebar
        isOpen={showChatbot}
        originalFeedback={originalFeedback}
        conversationHistory={conversationHistory}
        questionCount={questionCount}
        canSkip={canSkip}
        onClose={handleEditFeedback}
        onSubmitAnswer={handleChatSubmit}
        onSkip={handleSkipConversation}
        onEdit={handleEditFeedback}
        chatLoading={chatLoading}
      />
    </div>
  );
}
