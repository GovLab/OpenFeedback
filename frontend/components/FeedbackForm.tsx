'use client';

import { useState } from 'react';
import { api, ClassifiedFeedback, ConversationMessage } from '@/lib/api';

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
  const [classifiedData, setClassifiedData] = useState<ClassifiedFeedback | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [userInput, setUserInput] = useState('');
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
          setClassifiedData({
            text: feedback,
            category_map: {},
            sentiment: 'Neutral',
            priority: 'Medium'
          });
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
  
  const handleChatSubmit = async () => {
    if (!userInput.trim()) return;
    
    setChatLoading(true);
    
    // Add user message to history
    const newHistory = [
      ...conversationHistory,
      { role: 'user', content: userInput }
    ];
    setConversationHistory(newHistory);
    setUserInput('');
    
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
    setClassifiedData(null);
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
    setClassifiedData(null);
    setQuestionCount(0);
    setCanSkip(false);
    setHasBeenEnhanced(false); // Reset enhancement flag
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full">
      {/* Main Feedback Form */}
      <div className={`flex-1 bg-white rounded-lg shadow-md p-6 transition-opacity duration-300 ${showChatbot ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
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
            className={`w-full py-2 px-4 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${
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
      {showChatbot && (
        <div className="w-full md:w-96 bg-white rounded-lg shadow-xl flex flex-col animate-slide-in h-[500px] md:h-[600px]">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-semibold">Quick Questions</h3>
                <p className="text-xs text-blue-100 mt-1">Help us help you better</p>
              </div>
              <button
                onClick={handleEditFeedback}
                className="text-white hover:text-gray-200 transition-colors text-xl leading-none"
                title="Close and edit"
              >
                ✕
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span>Question {questionCount} of 5</span>
                <span>{Math.round((questionCount / 5) * 100)}%</span>
              </div>
              <div className="w-full bg-blue-800 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(questionCount / 5) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Original Feedback */}
          <div className="m-3 rounded-lg shadow-md p-3 bg-gray-50 border-b border-gray-200 max-h-24 overflow-y-auto">
            <p className="text-xs text-gray-500 mb-1">Your feedback:</p>
            <p className="text-sm text-gray-700 italic">&quot;{originalFeedback}&quot;</p>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {conversationHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm px-4 py-2">
                  <span className="text-sm animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {questionCount >= 2 && (
            <div className="px-4 pb-2">
              {canSkip ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleEditFeedback}
                    className="flex-1 text-sm px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    ← Edit Feedback
                  </button>
                  <button
                    onClick={handleSkipConversation}
                    className="flex-1 text-sm px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Done, Continue →
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 px-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800">
                    💬 Please provide a bit more detail to continue
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !chatLoading && handleChatSubmit()}
                placeholder="Type your answer..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                disabled={chatLoading}
              />
              <button
                onClick={handleChatSubmit}
                disabled={chatLoading || !userInput.trim()}
                className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
