'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowRight, MessageSquareText, X } from 'lucide-react';
import { ConversationMessage } from '@/lib/api';
import { buttonClass, ICON_BUTTON, INPUT } from '@/components/ui/styles';

const MAX_QUESTIONS = 5;
const STACKED_MAX_WIDTH = 1024; // Below lg the panel sits under the form

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface ChatbotSidebarProps {
  isOpen: boolean;
  conversationHistory: ConversationMessage[];
  questionCount: number;
  onClose: () => void;
  onSubmitAnswer: (answer: string) => Promise<void>;
  chatLoading: boolean;
  errorMessage?: string | null;
  readyToFinish: boolean;
  onFinish: () => void;
}

export default function ChatbotSidebar({
  isOpen,
  conversationHistory,
  questionCount,
  onClose,
  onSubmitAnswer,
  chatLoading,
  errorMessage = null,
  readyToFinish,
  onFinish
}: ChatbotSidebarProps) {
  const [userInput, setUserInput] = useState('');
  const chatbotRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Move focus into the panel when it opens, and scroll to it when it sits
  // under the form
  useEffect(() => {
    if (!isOpen || !chatbotRef.current) return;
    const timer = setTimeout(() => {
      if (window.innerWidth < STACKED_MAX_WIDTH) {
        chatbotRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }
      inputRef.current?.focus({ preventScroll: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Keep the newest message in view, inside the message list only
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }, [conversationHistory, chatLoading]);

  // Hand focus back to the answer box once the assistant replies
  useEffect(() => {
    if (isOpen && !chatLoading) inputRef.current?.focus({ preventScroll: true });
  }, [chatLoading, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!userInput.trim()) return;
    
    const answer = userInput;
    setUserInput('');
    await onSubmitAnswer(answer);
  };

  const progress = Math.min(questionCount, MAX_QUESTIONS);

  return (
    <section
      ref={chatbotRef}
      aria-labelledby="chatbot-title"
      className="animate-slide-in flex min-h-[520px] max-h-[85vh] w-full flex-col rounded-xl border border-slate-200 bg-white shadow-lg lg:min-h-[600px] lg:w-96 lg:shrink-0"
    >
      {/* Header */}
      <div className="rounded-t-xl border-b border-slate-200 bg-[#1871bd]/5 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1871bd] text-white">
              <MessageSquareText className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="chatbot-title" className="text-sm leading-snug text-[#091F2F]">
                Your personal feedback assistant
              </h2>
              <p className="mt-0.5 text-xs leading-snug text-slate-600">
                We need more information about your feedback!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={chatLoading}
            className={ICON_BUTTON}
            aria-label="Close assistant and return to your feedback"
            title="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="mb-1.5 flex justify-between text-xs text-slate-600">
            <span id="chatbot-progress-label" className="font-medium">Question {questionCount}/{MAX_QUESTIONS}</span>
            <span className="font-semibold text-[#0f4c81]" aria-hidden="true">
              {Math.round((progress / MAX_QUESTIONS) * 100)}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-labelledby="chatbot-progress-label"
            aria-valuemin={0}
            aria-valuemax={MAX_QUESTIONS}
            aria-valuenow={progress}
            className="h-1.5 w-full rounded-full bg-slate-200"
          >
            <div
              className="h-1.5 rounded-full bg-[#1871bd] transition-[width] duration-500"
              style={{ width: `${(progress / MAX_QUESTIONS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3"
      >
        {conversationHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'rounded-br-sm bg-[#091F2F] text-white'
                  : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'
              }`}
            >
              <span className="sr-only">{msg.role === 'user' ? 'You: ' : 'Assistant: '}</span>
              {msg.role === 'assistant' && (
                <span className="font-ui mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#0f4c81]" aria-hidden="true">
                  Assistant
                </span>
              )}
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
              <span className="flex gap-1" aria-hidden="true">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-1.5 w-1.5 rounded-full bg-[#1871bd] motion-safe:animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
              <span className="text-sm text-slate-600">Processing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Status */}
      {questionCount >= 2 && (
        <p className="font-ui mx-3 mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
          Additional details needed
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="mx-3 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-[var(--text-danger)]">
          {errorMessage}
        </p>
      )}

      {/* Answer */}
      <div className="rounded-b-xl border-t border-slate-200 bg-white p-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!chatLoading) handleSubmit();
          }}
        >
          <label htmlFor="chatbot-answer" className="sr-only">Your answer</label>
          <input
            ref={inputRef}
            id="chatbot-answer"
            type="text"
            autoComplete="off"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your response..."
            className={`${INPUT} flex-1`}
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={chatLoading || !userInput.trim()}
            aria-label="Send answer"
            className={buttonClass('primary', 'md', 'px-3.5')}
          >
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </form>
        {readyToFinish && (
          <button
            type="button"
            onClick={onFinish}
            disabled={chatLoading}
            className={buttonClass('primary', 'md', 'mt-3 w-full')}
          >
            Continue to review
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          disabled={chatLoading}
          className={buttonClass('secondary', 'md', 'mt-3 w-full')}
        >
          Skip questions and submit feedback
        </button>
      </div>
    </section>
  );
}
