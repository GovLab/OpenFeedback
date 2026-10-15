'use client';

import { useState, useEffect, useRef } from 'react';
import { api, ConversationMessage } from '@/lib/api';
import { topic } from '@/lib/topic';
import { CircleAlert, CircleCheck, Info, LoaderCircle, Sparkles } from 'lucide-react';
import ChatbotSidebar from './ChatbotSidebar';
import ContactOptIn, { ContactErrorField } from './ContactOptIn';
import { buttonClass, CARD } from '@/components/ui/styles';

type ErrorField = 'feedback' | ContactErrorField;

interface FeedbackFormProps {
  onFeedbackSubmitted: () => void;
}

export default function FeedbackForm({ onFeedbackSubmitted }: FeedbackFormProps) {
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<ErrorField>(null);
  
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
  const submitRef = useRef<HTMLButtonElement>(null);
  const wasChatOpen = useRef(false);

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

  // When the assistant closes, put keyboard focus back on the form
  useEffect(() => {
    if (wasChatOpen.current && !showChatbot) submitRef.current?.focus({ preventScroll: true });
    wasChatOpen.current = showChatbot;
  }, [showChatbot]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      setErrorField('feedback');
      setError('Please enter your message');
      return;
    }

    if (contactOptIn === null) {
      setErrorField('choice');
      setError('Please select whether you would like to be contacted');
      return;
    }

    // Validate required contact fields if user opted in
    if (contactOptIn === 'yes') {
      if (!contactInfo.name.trim()) {
        setErrorField('name');
        setError('Please provide your name');
        return;
      }
      if (!contactInfo.email.trim() && !contactInfo.phone.trim()) {
        setErrorField('method');
        setError('Please provide at least one contact method (email or phone number)');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setErrorField(null);

    try {
      // Use intelligent agent to check feedback quality (only if not already enhanced).
      // The agent is optional: if it fails, skip the follow-up questions and submit.
      if (!hasBeenEnhanced) {
        let agentData: Awaited<ReturnType<typeof api.feedbackAgent>> | null = null;
        try {
          agentData = await api.feedbackAgent({
            original_feedback: feedback,
            category_map: {},
            conversation_history: []
          });
        } catch (agentError) {
          console.error('Follow-up agent unavailable, submitting directly:', agentError);
        }

        // Every submission is accepted. One that looks off-topic or spammy
        // skips the follow-up questions and is tagged Not Relevant on the server.
        if (agentData && agentData.needs_followup && !agentData.is_invalid) {
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
      
      await api.submitFeedback(feedbackData);
      setFeedback('');
      setHasBeenEnhanced(false); // Reset for next submission
      setIsActuallyAugmented(false); // Reset augmentation flag
      setShowSuggestions(true); // Show suggestions for next feedback
      setContactOptIn(null); // Reset contact opt-in
      setContactInfo({ name: '', email: '', phone: '' }); // Reset contact fields
      onFeedbackSubmitted();
      setLoading(false);
    } catch (err) {
      setError('We could not send your feedback. Your text is still here, so please try again.');
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

  const isBusy = loading || showChatbot;
  const canSubmit = !isBusy && contactOptIn !== null;
  const errorId = 'feedback-form-error';

  return (
    <div className="flex w-full min-w-[280px] flex-col gap-6 lg:flex-row lg:items-start">
      {/* Main Feedback Form */}
      <div
        className={`${CARD} min-w-[280px] flex-1 p-6 shadow-md transition-opacity duration-300 sm:p-8 ${
          showChatbot ? 'pointer-events-none opacity-60' : 'opacity-100'
        }`}
        inert={showChatbot || undefined}
      >
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="feedback" className="block text-lg font-semibold text-slate-900">
              {topic.formQuestion}
            </label>

            {/* Suggestion prompts */}
            {showSuggestions && !isActuallyAugmented && (
              <div id="feedback-prompts" className="mt-2">
                <p className="text-sm italic text-slate-600">Need help? Try answering:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm italic leading-relaxed text-slate-600 marker:text-slate-400">
                  {suggestionPrompts.map((prompt, index) => (
                    <li key={index}>{prompt}</li>
                  ))}
                </ul>
              </div>
            )}

            {isActuallyAugmented && (
              <p className="font-ui mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#1871bd]/30 bg-[#1871bd]/10 px-3 py-1 text-sm font-semibold text-[#0f4c81]">
                <Sparkles className="h-4 w-4 text-[#1871bd]" aria-hidden="true" />
                Enhanced with details
              </p>
            )}

            <textarea
              maxLength={5000}
              ref={textareaRef}
              id="feedback"
              value={feedback}
              onChange={(e) => !isActuallyAugmented && setFeedback(e.target.value)}
              onFocus={() => setShowSuggestions(!isActuallyAugmented)}
              aria-describedby={
                [errorField === 'feedback' ? errorId : '', isActuallyAugmented ? 'feedback-enhanced-note' : showSuggestions ? 'feedback-prompts' : '']
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              aria-invalid={errorField === 'feedback' || undefined}
              className={`mt-3 max-h-[400px] min-h-[120px] w-full resize-y rounded-lg border-2 px-4 py-3 text-base leading-relaxed text-slate-900 transition-colors placeholder:text-slate-500 focus:border-[#1871bd] focus:outline-2 focus:outline-offset-0 focus:outline-[#1871bd] aria-[invalid=true]:border-[#b42318] ${
                isActuallyAugmented
                  ? 'cursor-not-allowed border-slate-200 bg-slate-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              placeholder={topic.formPlaceholder}
              disabled={isBusy || isActuallyAugmented}
            />

            {isActuallyAugmented && (
              <p id="feedback-enhanced-note" className="mt-3 flex items-start gap-2 text-sm text-slate-700">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1871bd]" aria-hidden="true" />
                We&apos;ve enhanced your feedback with details to guide us in helping you! Review and submit when ready!
              </p>
            )}
          </div>

          <ContactOptIn
            choice={contactOptIn}
            onChoiceChange={(choice) => {
              setContactOptIn(choice);
              if (errorField === 'choice') setError(null);
            }}
            details={contactInfo}
            onDetailsChange={setContactInfo}
            disabled={isBusy}
            errorField={errorField === 'feedback' ? null : errorField}
            errorId={errorId}
          />

          {error && (
            <div
              id={errorId}
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-[var(--text-danger)]"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            ref={submitRef}
            type="submit"
            disabled={!canSubmit}
            aria-describedby={contactOptIn === null && !isBusy ? 'submit-hint' : undefined}
            className={buttonClass('primary', 'lg', 'w-full')}
          >
            {loading ? (
              <>
                <LoaderCircle className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />
                Submitting...
              </>
            ) : isActuallyAugmented ? (
              <>
                <CircleCheck className="h-5 w-5" aria-hidden="true" />
                Submit Enhanced Response
              </>
            ) : (
              'Submit'
            )}
          </button>
          {contactOptIn === null && !isBusy && (
            <p id="submit-hint" className="-mt-2 text-center text-sm text-slate-600">
              Answer the contact question above to submit.
            </p>
          )}
        </form>
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
