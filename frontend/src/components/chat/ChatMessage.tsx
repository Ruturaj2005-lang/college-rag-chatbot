import React, { useState, useEffect } from 'react';
import { Message } from '../../types';
import {
  Sparkles,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Volume2,
  VolumeX,
  ArrowRight,
  HelpCircle,
  FileDown
} from 'lucide-react';
import { api } from '../../lib/api';
import { generateAndDownloadChatPdf } from '../../lib/pdfExport';
import { MarkdownContent } from './MarkdownContent';

interface ChatMessageProps {
  message: Message;
  onSendMessage?: (message: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onSendMessage,
}) => {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(message.feedback || null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userCopied, setUserCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isUser = message.role === 'user';
  const confidencePct = message.confidence ? Math.round(message.confidence * 100) : 0;

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (isSpeaking && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  const handleFeedback = async (type: 'positive' | 'negative') => {
    if (isSubmittingFeedback || feedback === type) return;
    setIsSubmittingFeedback(true);
    try {
      await api.feedback.submit(message.id, type);
      setFeedback(type);
    } catch (err) {
      console.error('Failed to record feedback', err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const copyUserMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setUserCopied(true);
      setTimeout(() => setUserCopied(false), 2000);
    } catch (err) {
      console.error('User copy failed', err);
    }
  };

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    // Strip markdown tags for clean reading
    const cleanText = message.content
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*/g, '')
      .replace(/[•\-\*]\s+/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const currentLang = localStorage.getItem('college_rag_lang') || 'en';
    const langMap: Record<string, string> = {
      en: 'en-US',
      hi: 'hi-IN',
      or: 'or-IN',
      es: 'es-ES',
      fr: 'fr-FR',
    };
    utterance.lang = langMap[currentLang] || 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Render User Message with Copy button on user input
  if (isUser) {
    return (
      <div className="flex justify-end mb-6 animate-in fade-in duration-200 group">
        <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%] flex-row-reverse">
          {/* User Avatar */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5 font-bold text-xs">
            <UserIcon className="w-4 h-4" />
          </div>

          {/* User Bubble with Copy Action */}
          <div className="flex flex-col items-end gap-1">
            <div className="bg-[#4B41E1] text-white px-4 py-3 rounded-2xl rounded-tr-xs text-sm sm:text-[15px] font-medium leading-relaxed shadow-xs selection:bg-white selection:text-[#4B41E1]">
              {message.content}
            </div>

            {/* User Message Copy Button */}
            <button
              onClick={copyUserMessage}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-gray-500 hover:text-[#4B41E1] px-1.5 py-0.5 rounded cursor-pointer"
              title="Copy message"
            >
              {userCopied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render AI Response: Clean White Document Card with #4B41E1 brand theme + Dark Mode
  return (
    <div className="flex flex-col mb-8 animate-in fade-in duration-200 max-w-[900px] mx-auto w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 px-1 mb-2">
        <div className="flex items-center gap-2">
          {/* Circular sparkle badge with color #4B41E1 */}
          <div className="w-6 h-6 rounded-full bg-[#4B41E1] flex items-center justify-center text-white shadow-xs flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 fill-white text-white" />
          </div>

          {/* Brand label with color #4B41E1 */}
          <span className="font-bold text-[#4B41E1] text-sm sm:text-[15px] tracking-tight">
            VibrantAI
          </span>

          {/* Model Pill Badge */}
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            GPT-4
          </span>

          {/* Grounded Verification Badge */}
          {message.grounded ? (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Grounded</span>
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold">
              <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Notice</span>
            </span>
          )}
        </div>

        {/* Right side actions: Speech, Match %, Copy */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {message.confidence !== undefined && message.confidence > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700">
              <span>Match</span>
              <span className="text-gray-900 dark:text-gray-100 font-bold">{confidencePct}%</span>
            </div>
          )}

          {/* Text-to-Speech (Audio Readout) Button */}
          <button
            onClick={toggleSpeech}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs ${
              isSpeaking
                ? 'bg-[#4B41E1] text-white animate-pulse'
                : 'text-gray-600 dark:text-gray-300 hover:text-[#4B41E1] hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title={isSpeaking ? 'Stop reading' : 'Read aloud (Text-to-Speech)'}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Copy Message Button */}
          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-[#4B41E1] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer flex items-center gap-1 text-xs"
            title="Copy Answer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-600 font-semibold text-[11px]">Copied</span>
              </>
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Download PDF Button */}
          <button
            onClick={() => {
              generateAndDownloadChatPdf([message], 'Vibrant AI Answer');
            }}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-[#4B41E1] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer flex items-center gap-1 text-xs"
            title="Download this answer as PDF"
          >
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Crisp White / Dark Document Container */}
      <div className="w-full bot-card p-6 sm:p-7 space-y-4">
        {/* Formatted Text Answer Body */}
        <MarkdownContent content={message.content} />

        {/* Dynamic Follow-Up Prompt Chips */}
        {message.suggested_followups && message.suggested_followups.length > 0 && onSendMessage && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400">
              <HelpCircle className="w-3.5 h-3.5 text-[#4B41E1]" />
              <span>Suggested Follow-up Questions:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.suggested_followups.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(chip)}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/90 hover:bg-[#4B41E1]/10 dark:hover:bg-[#4B41E1]/20 border border-gray-200 dark:border-gray-700 hover:border-[#4B41E1]/40 text-xs text-gray-700 dark:text-gray-200 font-medium transition-all text-left cursor-pointer active:scale-95 shadow-xs"
                >
                  <span>{chip}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-[#4B41E1] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Metadata & Feedback */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
          <span className="text-[11px] font-mono">
            Grounded on official college records
          </span>

          <div className="flex items-center gap-2">
            <span>Was this helpful?</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleFeedback('positive')}
                disabled={isSubmittingFeedback}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  feedback === 'positive'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-emerald-700'
                }`}
                title="Helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleFeedback('negative')}
                disabled={isSubmittingFeedback}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  feedback === 'negative'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-rose-700'
                }`}
                title="Not helpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
