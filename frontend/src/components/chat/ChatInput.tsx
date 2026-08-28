import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const toggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const currentLang = localStorage.getItem('college_rag_lang') || 'en';
      const langMap: Record<string, string> = {
        en: 'en-US',
        hi: 'hi-IN',
        or: 'or-IN',
        es: 'es-ES',
        fr: 'fr-FR',
      };
      recognition.lang = langMap[currentLang] || 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition', err);
      setIsListening(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || disabled) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-2.5 sm:p-4 md:p-6 bg-surface-container-lowest dark:bg-[#0B0F17] border-t border-surface-variant/50 dark:border-gray-800 w-full flex-shrink-0 transition-colors">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={isListening ? '🎙️ Listening to your question...' : 'Ask Vibrant AI anything (fees, admissions, hostel, scholarships)...'}
          className={`w-full bg-surface dark:bg-[#111827] border-2 rounded-xl py-3 pl-3.5 pr-22 sm:py-4 sm:pl-4 sm:pr-26 text-sm sm:text-base text-on-surface dark:text-gray-100 focus:outline-none transition-all resize-none shadow-xs font-sans leading-relaxed min-h-[48px] sm:min-h-[56px] ${
            isListening
              ? 'border-rose-500 ring-4 ring-rose-500/10'
              : 'border-surface-variant dark:border-gray-700 focus:border-[#4B41E1] focus:ring-4 focus:ring-[#4B41E1]/10'
          }`}
        />

        {/* Action Controls Inside Input */}
        <div className="absolute right-2 bottom-2 sm:right-3 sm:bottom-3 flex items-center gap-1.5">
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={disabled}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
            title={isListening ? 'Stop listening' : 'Speak your question (Voice Input)'}
          >
            {isListening ? (
              <MicOff className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            ) : (
              <Mic className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#4B41E1]" />
            )}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-[#4B41E1] text-white rounded-lg flex items-center justify-center hover:bg-[#3b32c4] transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Send message"
          >
            {disabled ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            )}
          </button>
        </div>
      </form>

      <p className="text-center text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-2 hidden sm:block">
        Vibrant AI answers are strictly grounded on official college records.
      </p>
    </div>
  );
};
