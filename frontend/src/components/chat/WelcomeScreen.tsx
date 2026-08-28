import React from 'react';
import { SuggestedQuestions } from './SuggestedQuestions';
import { Bot, ShieldCheck, FileCheck, Database } from 'lucide-react';

interface WelcomeScreenProps {
  onSelectQuestion: (question: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectQuestion }) => {
  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 md:py-12 px-2 sm:px-4 space-y-6 sm:space-y-8 animate-in fade-in duration-300 w-full">
      {/* Welcome Header */}
      <div className="text-center max-w-2xl mx-auto mt-2 sm:mt-6 mb-4 sm:mb-8 px-2">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#4B41E1]/10 dark:bg-[#4B41E1]/20 border border-[#4B41E1]/30 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-[0_0_30px_rgba(75,65,225,0.25)]">
          <Bot className="w-8 h-8 sm:w-9 sm:h-9 text-[#4B41E1] dark:text-[#818CF8]" />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2 sm:mb-3 tracking-tight">
          How can I help you today?
        </h2>
        <p className="text-xs sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-xl mx-auto">
          Instant, grounded answers for college admissions, semester fees, hostel rules, courses, and exam schedules.
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-4 sm:pt-5 text-xs text-gray-700 dark:text-gray-300 font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>Zero Hallucinations</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-2xs">
            <FileCheck className="w-4 h-4 text-[#4B41E1] dark:text-[#818CF8] flex-shrink-0" />
            <span>Verified Knowledge</span>
          </div>
        </div>
      </div>

      {/* Bento Grid Suggestions */}
      <div className="space-y-3 w-full">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Suggested Campus Inquiries
          </span>
          <span className="text-xs text-[#4B41E1] dark:text-[#818CF8] font-bold hidden sm:inline">
            Click any prompt to ask
          </span>
        </div>

        <SuggestedQuestions onSelectQuestion={onSelectQuestion} />
      </div>
    </div>
  );
};
