import React from 'react';
import { Source } from '../../types';
import { FileText, X, ExternalLink, Bookmark, CheckCircle2, Shield } from 'lucide-react';

interface SourceViewerModalProps {
  source: Source | null;
  onClose: () => void;
}

export const SourceViewerModal: React.FC<SourceViewerModalProps> = ({ source, onClose }) => {
  if (!source) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white border border-purple-100 rounded-2xl max-w-2xl w-full shadow-card-elevated overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-electric-950 via-sidebar to-sidebar-surface text-white flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-electric-600/30 border border-electric-400/40 text-electric-300 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  Official Knowledge Record
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Verified
                </span>
              </div>
              <p className="text-xs text-electric-200 truncate max-w-sm mt-0.5">
                {source.document_name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-electric-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Meta Details */}
        <div className="px-6 py-3 bg-electric-50/50 border-b border-purple-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-gray-600">
            {source.page_number && (
              <div className="flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5 text-electric-600" />
                <span>Page {source.page_number}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Document ID: <span className="font-mono text-[11px]">{source.document_id.slice(0, 8)}...</span></span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-electric-900 font-semibold">
            <span>Relevance Match:</span>
            <span className="px-2 py-0.5 rounded-md bg-electric-100 text-electric-800 font-mono text-[11px]">
              {Math.round(source.relevance_score * 100)}%
            </span>
          </div>
        </div>

        {/* Excerpt Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Retrieved Grounding Excerpt
            </span>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-800 leading-relaxed font-mono whitespace-pre-wrap selection:bg-electric-200 selection:text-electric-950">
              {source.excerpt || 'Full excerpt content available in document store.'}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Official Institutional Document Repository</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
