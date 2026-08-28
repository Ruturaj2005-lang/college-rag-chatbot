import React from 'react';
import { AnalyticsData } from '../../types';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Database
} from 'lucide-react';

interface AnalyticsCardsProps {
  analytics: AnalyticsData | null;
  isLoading: boolean;
}

export const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({ analytics, isLoading }) => {
  if (isLoading || !analytics) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 animate-pulse h-24 shadow-xs" />
        ))}
      </div>
    );
  }

  const confidencePct = Math.round(analytics.average_confidence * 100);
  const totalFeedback = analytics.positive_feedback + analytics.negative_feedback;
  const satisfactionRate = totalFeedback > 0 ? Math.round((analytics.positive_feedback / totalFeedback) * 100) : 100;

  const statItems = [
    {
      label: 'Total Documents',
      value: analytics.total_documents,
      icon: FileText,
      color: 'text-electric-600 bg-electric-50 border-electric-200',
      badge: 'Atlas Catalog',
    },
    {
      label: 'Vector Ready',
      value: analytics.ready_documents,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      badge: 'Indexed',
    },
    {
      label: 'Processing Queue',
      value: analytics.processing_documents,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      badge: 'Active Pipeline',
    },
    {
      label: 'Failed Ingestions',
      value: analytics.failed_documents,
      icon: AlertTriangle,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      badge: 'Attention',
    },
    {
      label: 'Queries Answered',
      value: analytics.total_questions,
      icon: HelpCircle,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      badge: 'RAG Pipeline',
    },
    {
      label: 'Avg Confidence',
      value: `${confidencePct}%`,
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      badge: 'Cosine Threshold >= 0.70',
    },
    {
      label: 'Helpful Ratings',
      value: analytics.positive_feedback,
      icon: ThumbsUp,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      badge: `${satisfactionRate}% positive`,
    },
    {
      label: 'Negative Flags',
      value: analytics.negative_feedback,
      icon: ThumbsDown,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      badge: 'Review Needed',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
      {statItems.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-gray-200/90 dark:border-gray-800 shadow-card-clean hover:shadow-card-elevated hover:border-[#4B41E1]/40 dark:hover:border-[#4B41E1]/50 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase">
                {stat.label}
              </span>
              <div className={`p-1.5 rounded-xl border ${stat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {stat.value}
              </div>
              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 block truncate">
                {stat.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
