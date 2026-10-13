'use client';

import { useState, useEffect, useRef } from 'react';
import { api, ClassifiedFeedback, ConversationMessage } from '@/lib/api';
import { topic } from '@/lib/topic';
import ChatbotSidebar from './ChatbotSidebar';

interface FeedbackFormProps {
  onFeedbackSubmitted: () => void;
  showClassificationResult?: boolean;
}

export default function FeedbackForm({ onFeedbackSubmitted }: FeedbackFormProps) {
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
  const [hasBeenEnhanced, setHasBeenEnhanced] = useState(false);
  const [isActuallyAugmented, setIsActuallyAugmented] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [prefetchedAugmentation, setPrefetchedAugmentation] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Contact opt-in state
  const [contactOptIn, setContactOptIn] = useState<'yes' | 'no' | null>(null);
  const [contactInfo, setContactInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Suggestion prompts to help users
  const suggestionPrompts = topic.suggestionPrompts;

  // Auto-resize textarea when feedback is augmented and scroll to bottom
  useEffect(() => {
    if (textareaRef.current && isActuallyAugmented) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      // Scroll to bottom to show the augmented content
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [feedback, isActuallyAugmented]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      setError('Please enter your message');
      return;
    }

    if (contactOptIn === null) {
      setError('Please select whether you would like to be contacted');
      return;
    }

    // Validate required contact fields if user opted in
    if (contactOptIn === 'yes') {
      if (!contactInfo.name.trim()) {
        setError('Please provide your name');
        return;
      }
      if (!contactInfo.email.trim() && !contactInfo.phone.trim()) {
        setError('Please provide at least one contact method (email or phone number)');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Use intelligent agent to check feedback quality (only if not already enhanced)
      if (!hasBeenEnhanced) {
        const agentData = await api.feedbackAgent({ 
          original_feedback: feedback,
          category_map: {},
          conversation_history: []
        });
        
        // Check if feedback is spam/invalid
        if (agentData.is_invalid) {
          setError(topic.rejectionMessage);
          setLoading(false);
          return;
        }
        
        if (agentData.needs_followup) {
          // Low quality - show chatbot sidebar with agent's first question
          setOriginalFeedback(feedback);
          setConversationHistory([{
            role: 'assistant',
            content: agentData.message
          }]);
          setQuestionCount(1);
          setShowChatbot(true);
          setLoading(false);
          return;
        }
      }
      
      // High quality or already enhanced - classify and submit to DB
      const feedbackData: any = { text: feedback };
      
      // Include contact info if user opted in
      if (contactOptIn === 'yes') {
        feedbackData.contact_info = {
          opted_in: true,
          name: contactInfo.name || null,
          email: contactInfo.email || null,
          phone: contactInfo.phone || null
        };
      } else {
        feedbackData.contact_info = {
          opted_in: false
        };
      }
      
      const submitted = await api.submitFeedback(feedbackData);
      setResult(submitted);
      setFeedback('');
      setHasBeenEnhanced(false); // Reset for next submission
      setIsActuallyAugmented(false); // Reset augmentation flag
      setShowSuggestions(true); // Show suggestions for next feedback
      setContactOptIn(null); // Reset contact opt-in
      setContactInfo({ name: '', email: '', phone: '' }); // Reset contact fields
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
      
      // Call intelligent agent with full conversation history
      const agentData = await api.feedbackAgent({
        original_feedback: originalFeedback,
        category_map: {},
        conversation_history: newHistory
      });
      
      // Add agent's response to history
      const updatedHistory = [
        ...newHistory,
        { role: 'assistant', content: agentData.message }
      ];
      setConversationHistory(updatedHistory);
      
      // Auto-finish if quality is sufficient OR after 5 questions
      const shouldFinish = !agentData.needs_followup || newQuestionCount >= 5;
      
      if (shouldFinish) {
        // Prefetch augmentation before finishing
        const hasUserAnswers = updatedHistory.some(msg => msg.role === 'user');
        if (hasUserAnswers) {
          // Start augmentation in background
          api.augmentFeedback({
            original_feedback: originalFeedback,
            conversation_history: updatedHistory
          })
            .then((augmentationResult) => {
              setPrefetchedAugmentation(augmentationResult.additional_note);
            })
            .catch((error) => {
              console.error('Error prefetching augmentation:', error);
              // Fallback to simple concatenation if AI fails
              const conversationText = updatedHistory
                .filter(msg => msg.role === 'user')
                .map(msg => msg.content)
                .join(' ');
              setPrefetchedAugmentation(conversationText);
            });
        }
        // Auto-finish when quality is sufficient or after 5 questions
        setTimeout(() => finishConversation(updatedHistory, true), 1500);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const finishConversation = async (historyToUse?: ConversationMessage[], usePrefetched: boolean = false) => {
    // Use provided history or fall back to current state
    const history = historyToUse ?? conversationHistory;
    
    // Check if user actually answered any questions
    const hasUserAnswers = history.some(msg => msg.role === 'user');
    
    if (!hasUserAnswers) {
      // User skipped without answering, use original feedback as-is
      setFeedback(originalFeedback);
      setPrefetchedAugmentation(null);
    } else {
      let additionalNote: string | null = null;
      
      if (usePrefetched && prefetchedAugmentation) {
        // Use prefetched augmentation if available
        additionalNote = prefetchedAugmentation;
      } else {
        // Generate augmentation on demand
        try {
          const augmentationResult = await api.augmentFeedback({
            original_feedback: originalFeedback,
            conversation_history: history
          });
          additionalNote = augmentationResult.additional_note;
        } catch (error) {
          console.error('Error augmenting feedback:', error);
          // Fallback to simple concatenation if AI fails
          const conversationText = history
            .filter(msg => msg.role === 'user')
            .map(msg => msg.content)
            .join(' ');
          additionalNote = conversationText;
        }
      }
      
      // Keep original feedback and append AI-generated note
      const enhancedFeedback = `${originalFeedback}\n\nAdditional note: ${additionalNote}`;
      setFeedback(enhancedFeedback);
      setPrefetchedAugmentation(null);
      setIsActuallyAugmented(true);
    }

    // Close chatbot and put enhanced text back in textarea
    setShowChatbot(false);
    setHasBeenEnhanced(true);
    
    // Reset chatbot state
    setConversationHistory([]);
    setOriginalFeedback('');
    setQuestionCount(0);
  };

  const handleCloseChatbot = async () => {
    // Check if user answered at least one question
    const hasUserAnswers = conversationHistory.some(msg => msg.role === 'user');
    
    if (hasUserAnswers) {
      // User answered at least one question - augment feedback
      await finishConversation(conversationHistory, true);
    } else {
      // User skipped after 1st question - just restore original feedback
      // Mark as enhanced so it can be submitted without triggering chatbot again
      setFeedback(originalFeedback);
      setHasBeenEnhanced(true);
      setShowChatbot(false);
      setPrefetchedAugmentation(null);
      // Reset chatbot state
      setConversationHistory([]);
      setOriginalFeedback('');
      setQuestionCount(0);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full min-w-[280px]">
      {/* Main Feedback Form */}
      <div className={`flex-1 rounded-xl shadow-lg border p-6 sm:p-8 transition-opacity duration-300 min-w-[280px] ${showChatbot ? 'opacity-60 pointer-events-none' : 'opacity-100'}`} style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'var(--boston-blue-desaturated)',
        borderWidth: '1px',
        boxShadow: '0 4px 6px -1px rgba(24, 113, 189, 0.1), 0 2px 4px -1px rgba(24, 113, 189, 0.06)'
      }}>
        <div className="mb-2">
          <label htmlFor="feedback" className="block text-lg font-semibold text-slate-900">
            {topic.formQuestion}
          </label>
        </div>
        {/* Suggestion prompts */}
        {showSuggestions && !isActuallyAugmented && (
          <div className="mb-2 space-y-1">
            <p className="text-xs italic mb-1.5" style={{ color: 'var(--boston-gray-dark)', opacity: 0.8 }}>
              Need help? Try answering:
            </p>
            <div className="space-y-0.5 pl-1">
              {suggestionPrompts.map((prompt, index) => (
                <p
                  key={index}
                  className="text-xs italic leading-relaxed"
                  style={{ color: 'var(--boston-gray-dark)', opacity: 0.8 }}
                >
                  • {prompt}
                </p>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            {isActuallyAugmented && (
              <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ 
                backgroundColor: 'rgba(24, 113, 189, 0.12)', 
                borderColor: 'var(--boston-optimistic-blue)',
                borderWidth: '1px',
                color: 'var(--boston-optimistic-blue)'
              }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Enhanced with details
              </div>
            )}
            
            <textarea
              maxLength={5000}
              ref={textareaRef}
              id="feedback"
              value={feedback}
              onChange={(e) => !isActuallyAugmented && setFeedback(e.target.value)}
              onFocus={() => setShowSuggestions(!isActuallyAugmented)}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-[#007A33] focus:border-[#007A33] text-slate-900 resize-y placeholder:text-slate-400 text-base leading-relaxed max-h-[400px] ${
                isActuallyAugmented 
                  ? 'border-slate-200 bg-slate-50 cursor-not-allowed' 
                  : 'border-slate-300 min-h-[120px]'
              }`}
              style={isActuallyAugmented ? { minHeight: '120px' } : undefined}
              placeholder={topic.formPlaceholder}
              disabled={loading || showChatbot || isActuallyAugmented}
            />
            
            {isActuallyAugmented && (
              <div className="mt-3 flex items-start gap-2 text-sm" style={{ color: 'var(--boston-gray-dark)' }}>
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--boston-optimistic-blue)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>We've enhanced your feedback with details to guide us in helping you! Review and submit when ready!</span>
              </div>
            )}
            
          
          </div>

          {/* Contact Opt-in Section */}
          <div className="border-t pt-5" style={{ borderColor: 'var(--boston-blue-desaturated)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm font-medium text-slate-900">
                Can we contact you with questions about your feedback?
                <span className="text-red-500 ml-1">*</span>
              </p>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setContactOptIn(contactOptIn === 'yes' ? null : 'yes')}
                  disabled={loading || showChatbot}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 border-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    contactOptIn === 'yes'
                      ? 'shadow-md'
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                  onMouseEnter={(e) => {
                    if (contactOptIn !== 'yes' && !e.currentTarget.disabled) {
                      e.currentTarget.style.borderColor = 'var(--boston-optimistic-blue)';
                      e.currentTarget.style.backgroundColor = 'rgba(24, 113, 189, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (contactOptIn !== 'yes') {
                      e.currentTarget.style.borderColor = '';
                      e.currentTarget.style.backgroundColor = '';
                    }
                  }}
                  style={contactOptIn === 'yes' ? { backgroundColor: 'rgba(24, 113, 189, 0.1)', borderColor: 'var(--boston-optimistic-blue)', color: 'var(--boston-optimistic-blue)' } : {}}
                >
                  <svg className={`w-5 h-5 ${contactOptIn === 'yes' ? '' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={contactOptIn === 'yes' ? { color: 'var(--boston-optimistic-blue)' } : {}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Yes
                </button>
                
                <button
                  type="button"
                  onClick={() => setContactOptIn(contactOptIn === 'no' ? null : 'no')}
                  disabled={loading || showChatbot}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 border-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    contactOptIn === 'no'
                      ? 'bg-red-50 border-red-500 text-red-700 shadow-md'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-red-400 hover:bg-red-50'
                  }`}
                >
                  <svg className={`w-5 h-5 ${contactOptIn === 'no' ? 'text-red-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  No
                </button>
              </div>
            </div>

            {/* Conditional Contact Fields */}
            {contactOptIn === 'yes' && (
              <div className="space-y-5 p-5 mt-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--boston-optimistic-blue)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-slate-600">
                    Please provide your name and at least one contact method (email or phone).
                  </p>
                </div>
                
                <div className="rounded-lg p-3" style={{
                  backgroundColor: 'rgba(24, 113, 189, 0.08)',
                  borderColor: 'var(--boston-blue-desaturated)',
                  borderWidth: '1px'
                }}>
                  <p className="text-sm" style={{ color: 'var(--boston-charles-blue)' }}>
                    We respect your privacy. We will only use your contact information to respond to your feedback.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="group sm:col-span-2">
                    <label htmlFor="contactName" className="block text-sm font-medium text-slate-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="contactName"
                      value={contactInfo.name}
                      onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                      disabled={loading || showChatbot}
                      placeholder="Your name"
                      required
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-900 transition-all duration-200 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed placeholder:text-slate-400"
                    />
                  </div>

                  <div className="group">
                    <label htmlFor="contactEmail" className="block text-sm font-medium text-slate-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="contactEmail"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                      disabled={loading || showChatbot}
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-900 transition-all duration-200 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed placeholder:text-slate-400"
                    />
                  </div>

                  <div className="group">
                    <label htmlFor="contactPhone" className="block text-sm font-medium text-slate-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="contactPhone"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                      disabled={loading || showChatbot}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-900 transition-all duration-200 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || showChatbot || contactOptIn === null}
            className={`w-full py-3.5 px-6 rounded-lg font-semibold text-base transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed`}
            style={{ 
              backgroundColor: (loading || showChatbot || contactOptIn === null) 
                ? 'var(--boston-gray-medium-dark)' 
                : 'var(--boston-optimistic-blue)',
              color: 'white',
              opacity: (loading || showChatbot || contactOptIn === null) ? 0.6 : 1
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              if (!loading && !showChatbot && contactOptIn !== null) {
                e.currentTarget.style.backgroundColor = 'var(--boston-charles-blue)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !showChatbot && contactOptIn !== null) {
                e.currentTarget.style.backgroundColor = 'var(--boston-optimistic-blue)';
              }
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </span>
            ) : isActuallyAugmented ? (
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
      </div>

      {/* Chatbot Sidebar */}
      <ChatbotSidebar
        isOpen={showChatbot}
        conversationHistory={conversationHistory}
        questionCount={questionCount}
        onClose={handleCloseChatbot}
        onSubmitAnswer={handleChatSubmit}
        chatLoading={chatLoading}
      />
    </div>
  );
}
