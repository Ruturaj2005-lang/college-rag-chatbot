import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Document, DocumentDetail } from '../../types';
import {
  FileText,
  X,
  Layers,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Database,
  Hash,
  Download
} from 'lucide-react';

interface DocumentDetailModalProps {
  document: Document | null;
  onClose: () => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  onClose,
}) => {
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      loadDetail(document.id);
    } else {
      setDetail(null);
    }
  }, [document]);

  // Keyboard shortcut Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [document, onClose]);

  const loadDetail = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.admin.getDocument(id);
      setDetail(data);
    } catch (err: any) {
      console.error('Failed to load document detail', err);
      setError('Could not retrieve document chunks.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!document) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Prominent Close Button */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-[#4B41E1]/30 border border-[#4B41E1]/40 text-[#a5b4fc] flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate max-w-md">
                {document.title || document.file_name}
              </h3>
              <p className="text-xs text-gray-300 font-mono truncate">
                {document.file_name} • {document.file_type.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Prominent Header Close Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all text-xs font-semibold cursor-pointer border border-white/20 active:scale-95 flex-shrink-0"
            title="Close document viewer (Esc)"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Document Stats Bar */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-[#0B0F17] border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Status:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                {document.status}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#4B41E1] dark:text-[#818CF8]" />
              <span>Chunks: <strong className="font-mono text-gray-900 dark:text-white">{document.chunk_count}</strong></span>
            </div>
          </div>

          <div className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">
            Indexed: {new Date(document.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Content Body: Chunk List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-gray-50/50 dark:bg-[#0B0F17] custom-scrollbar">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Atlas Vector Chunks ({detail?.chunks?.length || document.chunk_count})
            </span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
              1536-Dimensional Embeddings
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-400 dark:text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin text-[#4B41E1]" />
              <p className="text-xs">Loading vector chunks from Atlas...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          ) : detail?.chunks && detail.chunks.length > 0 ? (
            <div className="space-y-3">
              {detail.chunks.map((c, i) => (
                <div
                  key={c.id || i}
                  className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-2xs hover:border-[#4B41E1]/40 dark:hover:border-[#4B41E1]/40 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between text-xs pb-1.5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#4B41E1]/15 text-[#4B41E1] dark:text-[#818CF8] border border-[#4B41E1]/20">
                        Chunk #{c.chunk_index + 1}
                      </span>
                      {c.page_number && (
                        <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                          Page {c.page_number}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 dark:text-gray-500 font-mono text-[10px]">
                      ID: {c.id.slice(0, 8)}...
                    </span>
                  </div>

                  <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-mono whitespace-pre-wrap selection:bg-[#4B41E1]/20">
                    {c.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-xs">
              No chunk details available.
            </div>
          )}
        </div>

        {/* Footer with Download & Close Buttons */}
        <div className="p-4 bg-white dark:bg-[#0B0F17] border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="font-mono text-[11px] hidden sm:inline">MongoDB Atlas Vector Store</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={async () => {
                if (!document) return;
                setIsDownloading(true);
                try {
                  await api.documents.download(document.id, document.file_name);
                } catch (err) {
                  console.error('Download failed', err);
                  const url = api.documents.downloadUrl(document.id);
                  window.open(url, '_blank');
                } finally {
                  setIsDownloading(false);
                }
              }}
              disabled={isDownloading}
              className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold text-xs transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Download original file"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4B41E1]" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#4B41E1]" />
              )}
              <span>{isDownloading ? 'Downloading...' : 'Download File'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#4B41E1] hover:bg-[#3b32c4] text-white font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>Close Document</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
