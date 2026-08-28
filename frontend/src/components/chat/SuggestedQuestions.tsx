import React from 'react';
import {
  DollarSign,
  Building,
  GraduationCap,
  BookOpen,
  Award,
  Briefcase,
  Calendar,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void;
}

interface BentoItem {
  id: string;
  title: string;
  subtitle: string;
  fullQuestion: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const BENTO_QUESTIONS: BentoItem[] = [
  {
    id: 'fees',
    title: 'Tuition & Fee Structure',
    subtitle: 'Annual B.Tech CSE fees and exam charges',
    fullQuestion: 'What is the annual tuition fee and semester examination fee for CSE?',
    icon: DollarSign,
    iconBg: 'bg-[#4B41E1]/10 dark:bg-[#4B41E1]/20',
    iconColor: 'text-[#4B41E1] dark:text-[#818CF8]',
  },
  {
    id: 'hostel',
    title: 'Hostel Guidelines & Mess',
    subtitle: 'Curfew in-timings and meal schedules',
    fullQuestion: 'What are the hostel gate curfew in-timings and monthly mess charges?',
    icon: Building,
    iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'admissions',
    title: 'Admissions & Cutoffs',
    subtitle: 'JEE Main ranks and eligibility criteria',
    fullQuestion: 'What are the eligibility criteria and required cutoff for B.Tech admission?',
    icon: GraduationCap,
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'courses',
    title: 'Semester 4 CSE Syllabus',
    subtitle: 'Database Systems, OS, and credits',
    fullQuestion: 'What courses and subjects are offered in Semester 4 for CSE students?',
    icon: BookOpen,
    iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    id: 'scholarships',
    title: 'Merit Scholarships & Aid',
    subtitle: 'Waivers for high SGPA or JEE merit',
    fullQuestion: 'What scholarships and fee waivers are available for high SGPA or JEE ranks?',
    icon: Award,
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'placements',
    title: 'Placements & CTC Stats',
    subtitle: 'Eligible CGPA and average packages',
    fullQuestion: 'What is the placement eligibility criteria and average package for CSE?',
    icon: Briefcase,
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'calendar',
    title: 'Academic Calendar 2026',
    subtitle: 'Semester start dates and exam schedules',
    fullQuestion: 'When do the autumn semester classes commence and when are the mid-term exams?',
    icon: Calendar,
    iconBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    id: 'attendance',
    title: 'Attendance & Regulations',
    subtitle: '75% mandatory rule and condonation',
    fullQuestion: 'What is the minimum attendance requirement to take semester examinations?',
    icon: ShieldCheck,
    iconBg: 'bg-teal-500/10 dark:bg-teal-500/20',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
];

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onSelectQuestion }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto w-full">
      {BENTO_QUESTIONS.map((item) => {
        const IconComponent = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onSelectQuestion(item.fullQuestion)}
            className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-4 sm:p-5 text-left hover:border-[#4B41E1] dark:hover:border-[#4B41E1] hover:shadow-md dark:hover:shadow-[0_0_24px_rgba(75,65,225,0.22)] transition-all group flex flex-col justify-between space-y-3 cursor-pointer active:scale-[0.98]"
          >
            <div>
              <div className="mb-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${item.iconBg} ${item.iconColor} group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-1.5 group-hover:text-[#4B41E1] dark:group-hover:text-[#818CF8] transition-colors leading-snug">
                {item.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                {item.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#4B41E1] dark:text-[#818CF8] font-bold group-hover:translate-x-1 transition-transform pt-1">
              <span>Ask prompt</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        );
      })}
    </div>
  );
};
