'use client';

import { useState, useEffect, useRef } from 'react';
import { ConversationMessage } from '@/lib/api';

interface ChatbotSidebarProps {
  isOpen: boolean;
  conversationHistory: ConversationMessage[];
  questionCount: number;
  onClose: () => void;
  onSubmitAnswer: (answer: string) => Promise<void>;
  chatLoading: boolean;
}

export default function ChatbotSidebar({
  isOpen,
  conversationHistory,
  questionCount,
  onClose,
  onSubmitAnswer,
  chatLoading
}: ChatbotSidebarProps) {
  const [userInput, setUserInput] = useState('');
  const chatbotRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when new messages are added or loading state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationHistory, chatLoading]);

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
    <div ref={chatbotRef} className="w-full md:w-96 rounded-xl shadow-2xl flex flex-col animate-slide-in h-[500px] md:h-[600px] border" style={{
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: 'var(--boston-blue-desaturated)',
      boxShadow: '0 10px 15px -3px rgba(24, 113, 189, 0.15), 0 4px 6px -2px rgba(24, 113, 189, 0.1)'
    }}>
      {/* Header - Compact */}
      <div className="px-4 py-3 border-b rounded-t-xl" style={{
        backgroundColor: 'rgba(24, 113, 189, 0.05)',
        borderColor: 'var(--boston-blue-desaturated)'
      }}>
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md flex-shrink-0" style={{ background: 'linear-gradient(to bottom right, var(--boston-optimistic-blue), var(--boston-charles-blue))' }}>
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
            <span className="font-semibold" style={{ color: 'var(--boston-optimistic-blue)' }}>{Math.round((questionCount / 5) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{ backgroundColor: 'var(--boston-optimistic-blue)', width: `${(questionCount / 5) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Chat Messages - Maximized Space */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5" style={{ backgroundColor: 'rgba(242, 242, 242, 0.5)' }}>
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
                  <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--boston-optimistic-blue)' }}>
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
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ animationDelay: '0ms', backgroundColor: 'var(--boston-optimistic-blue)' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ animationDelay: '150ms', backgroundColor: 'var(--boston-optimistic-blue)' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ animationDelay: '300ms', backgroundColor: 'var(--boston-optimistic-blue)' }}></span>
                </div>
                <span className="text-sm text-gray-600">Processing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Status Message */}
      {questionCount >= 2 && (
        <div className="px-3 pb-2">
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
        </div>
      )}

      {/* Input Area - Compact */}
      <div className="p-3 border-t rounded-b-xl" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'var(--boston-blue-desaturated)'
      }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your response..."
            className="flex-1 px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 text-gray-900 placeholder-gray-400 text-sm transition-all"
            style={{ '--tw-ring-color': 'var(--boston-optimistic-blue)', '--tw-border-color': 'var(--boston-optimistic-blue)' } as React.CSSProperties}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--boston-optimistic-blue)';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24, 113, 189, 0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '';
              e.currentTarget.style.boxShadow = '';
            }}
            disabled={chatLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={chatLoading || !userInput.trim()}
            className="text-white px-5 py-2.5 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all text-sm font-semibold shadow-sm"
            style={{ backgroundColor: 'var(--boston-optimistic-blue)' }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = 'var(--boston-charles-blue)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--boston-optimistic-blue)';
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M12 5l8 8m0 0l-8 8m8-8H4" />
            </svg>
          </button>
        </div>
        {/* Skip Button - Always Available */}
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--boston-blue-desaturated)' }}>
          <button
            onClick={onClose}
            disabled={chatLoading}
            className="w-full text-sm px-4 py-2.5 border-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm"
            style={{
              borderColor: 'var(--boston-blue-desaturated)',
              color: 'var(--boston-charles-blue)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)'
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = 'rgba(24, 113, 189, 0.05)';
                e.currentTarget.style.borderColor = 'var(--boston-optimistic-blue)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
              e.currentTarget.style.borderColor = 'var(--boston-blue-desaturated)';
            }}
          >
            Skip questions and submit feedback
          </button>
        </div>
      </div>
    </div>
  );
}

