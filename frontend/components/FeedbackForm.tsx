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
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Suggestion prompts to help users
  const suggestionPrompts = [
    "What specific feature or service would you like to see improved?",
    "Can you describe a problem you encountered?",
    "What was your experience with [specific process/feature]?",
    "How could we make [service/process] easier or faster?",
    "What frustrated you about your recent interaction?",
    "What did you really like that we should keep doing?",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      setError('Please enter your message');
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
      setShowSuggestions(true); // Show suggestions for next feedback
      onFeedbackSubmitted();
      setLoading(false);
    } catch (err) {
      setError('Submission failed. Please try again.');
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
    <div className="flex flex-col md:flex-row gap-6 w-full min-w-[280px]">
      {/* Main Feedback Form */}
      <div className={`flex-1 bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8 transition-opacity duration-300 min-w-[280px] ${showChatbot ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        <div className="mb-5">
          <label htmlFor="feedback" className="block text-lg font-semibold mb-1 text-slate-900">
            Your Input
          </label>
          <p className="text-sm text-slate-600">Share what's on your mind</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            {hasBeenEnhanced && (
              <div className="mb-3 inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-emerald-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Enhanced with details
              </div>
            )}
            
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                // If user manually edits enhanced feedback, keep the flag but allow changes
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-[#007A33] focus:border-[#007A33] text-slate-900 resize-y placeholder:text-slate-400 text-base leading-relaxed min-h-[120px] max-h-[400px]"
              placeholder="Type your message here..."
              disabled={loading || showChatbot}
            />
            
            {hasBeenEnhanced && (
              <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Enhanced with additional details. Review and submit when ready.</span>
              </div>
            )}
            
            {/* Suggestion prompts */}
            {showSuggestions && !hasBeenEnhanced && !feedback && (
              <div className="mt-3 space-y-1">
                <p className="text-xs italic text-slate-500 mb-1.5">
                  Need help? Try answering:
                </p>
                <div className="space-y-0.5 pl-1">
                  {suggestionPrompts.map((prompt, index) => (
                    <p
                      key={index}
                      className="text-xs italic text-slate-500 leading-relaxed"
                    >
                      • {prompt}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Quick tips when user starts typing */}
            {feedback && !hasBeenEnhanced && feedback.length < 50 && (
              <p className="text-xs italic text-slate-500 mt-2 leading-relaxed">
                Tip: Include specific examples, what you expected vs. what happened, or any issues you faced
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || showChatbot}
            className={`w-full py-3.5 px-6 rounded-lg font-semibold text-base disabled:bg-slate-300 disabled:cursor-not-allowed disabled:text-slate-500 transition-all duration-200 shadow-sm hover:shadow-md ${
              hasBeenEnhanced 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : 'bg-[#007A33] hover:bg-[#005A25] text-white'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </span>
            ) : hasBeenEnhanced ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Submit Enhanced Response
              </span>
            ) : 'Submit'}
          </button>
        </form>

        {error && (
          <div className="mt-5 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {showClassificationResult && result && (
          <div className="mt-5 p-5 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg">
            <div className="flex items-start gap-3 mb-3">
              <svg className="w-6 h-6 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-semibold text-emerald-900 text-lg">Feedback Received!</h3>
            </div>
            <div className="text-sm text-emerald-800 space-y-2 ml-9">
              {result.category_map && Object.entries(result.category_map).map(([category, subcategories]) => (
                <div key={category} className="flex gap-2">
                  <span className="font-semibold">{category}:</span>
                  <span className="text-emerald-700">{subcategories.join(', ')}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <span className="font-semibold">Sentiment:</span>
                <span className="text-emerald-700 capitalize">{result.sentiment}</span>
              </div>
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
