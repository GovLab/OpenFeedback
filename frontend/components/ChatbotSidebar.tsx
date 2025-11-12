'use client';

import { useState, useEffect, useRef } from 'react';
import { ConversationMessage } from '@/lib/api';

interface ChatbotSidebarProps {
  isOpen: boolean;
  conversationHistory: ConversationMessage[];
  questionCount: number;
  canSkip: boolean;
  onClose: () => void;
  onSubmitAnswer: (answer: string) => Promise<void>;
  onSkip: () => void;
  onEdit: () => void;
  chatLoading: boolean;
}

export default function ChatbotSidebar({
  isOpen,
  conversationHistory,
  questionCount,
  canSkip,
  onClose,
  onSubmitAnswer,
  onSkip,
  onEdit,
  chatLoading
}: ChatbotSidebarProps) {
  const [userInput, setUserInput] = useState('');
  const chatbotRef = useRef<HTMLDivElement>(null);

  // Scroll to chatbot on mobile when it opens
  useEffect(() => {
    if (isOpen && chatbotRef.current) {
      // Check if it's a mobile device (viewport width < 768px)
      const isMobile = window.innerWidth < 768;
      
      if (isMobile) {
        // Small delay to ensure the component has fully rendered
        setTimeout(() => {
          chatbotRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 100);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!userInput.trim()) return;
    
    const answer = userInput;
    setUserInput('');
    await onSubmitAnswer(answer);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !chatLoading) {
      handleSubmit();
    }
  };

  return (
    <div ref={chatbotRef} className="w-full md:w-96 bg-white rounded-xl shadow-2xl flex flex-col animate-slide-in h-[500px] md:h-[600px] border border-gray-200">
      {/* Header - Compact */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white rounded-t-xl">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#007A33] to-[#005A25] flex items-center justify-center shadow-md flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight">Your personal feedback assistant</h3>
              <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                We need more information about your feedback!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none hover:bg-gray-100 rounded-lg w-7 h-7 flex items-center justify-center flex-shrink-0"
            title="Close"
          >
            ✕
          </button>
        </div>
        
        {/* Progress Bar - Compact */}
        <div className="mt-2.5">
          <div className="flex justify-between text-xs mb-1.5 text-gray-600">
            <span className="font-medium">Question {questionCount}/5</span>
            <span className="font-semibold text-[#007A33]">{Math.round((questionCount / 5) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-[#007A33] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(questionCount / 5) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Chat Messages - Maximized Space */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-gray-50">
        {conversationHistory.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3.5 py-2.5 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-gray-800 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-gray-200">
                  <div className="w-4 h-4 rounded bg-[#007A33] flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">System</span>
                </div>
              )}
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white text-gray-800 rounded-lg rounded-bl-sm px-3.5 py-2.5 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[#007A33] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-[#007A33] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-[#007A33] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-sm text-gray-600">Processing...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {questionCount >= 2 && (
        <div className="px-3 pb-2">
          {canSkip ? (
            <div className="flex gap-2">
              <button
                onClick={onEdit}
                className="flex-1 text-sm px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                ← Edit
              </button>
              <button
                onClick={onSkip}
                className="flex-1 text-sm px-3 py-2 bg-[#007A33] text-white rounded-lg hover:bg-[#005A25] transition-all shadow-sm font-semibold"
              >
                Continue →
              </button>
            </div>
          ) : (
            <div className="text-center py-2 px-3 bg-amber-50 border border-amber-300 rounded-lg">
              <div className="flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-amber-800 font-semibold">
                  Additional details needed
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Area - Compact */}
      <div className="p-3 border-t border-gray-200 bg-white rounded-b-xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your response..."
            className="flex-1 px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#007A33] focus:border-[#007A33] text-gray-900 placeholder-gray-400 text-sm transition-all"
            disabled={chatLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={chatLoading || !userInput.trim()}
            className="bg-[#007A33] text-white px-5 py-2.5 rounded-lg hover:bg-[#005A25] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all text-sm font-semibold shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

