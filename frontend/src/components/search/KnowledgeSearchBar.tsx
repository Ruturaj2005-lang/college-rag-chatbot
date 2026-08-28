import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, ArrowRight, Loader2, X, Sparkles, BookOpen, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { SearchResult } from '../../types';
import { MarkdownContent } from '../chat/MarkdownContent';

interface KnowledgeSearchBarProps {
  onAskQuestion?: (question: string) => void;
  className?: string;
}

export const KnowledgeSearchBar: React.FC<KnowledgeSearchBarProps> = ({
  onAskQuestion,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setTotalMatches(0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await api.search.query(query.trim(), 8);
        setResults(data.results);
        setTotalMatches(data.total_matches);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSelectedResult(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAskAI = (item: SearchResult) => {
    if (onAskQuestion) {
      const generatedPrompt = `Tell me more about ${item.document_name}: ${query}`;
      onAskQuestion(generatedPrompt);
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleQuickChip = (keyword: string) => {
    setQuery(keyword);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-gray-400 dark:text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Search college knowledge base..."
          className="w-full pl-9.5 pr-14 py-2 sm:py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111827] text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[#4B41E1] focus:ring-2 focus:ring-[#4B41E1]/15 transition-all shadow-2xs font-sans"
        />

        {/* Action icons on right */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-[#4B41E1] animate-spin" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Results Dropdown Popover */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 max-h-[80vh] sm:max-h-[520px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3 sm:px-4 sm:py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0B0F17] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                Search results for <span className="text-[#4B41E1] dark:text-[#818CF8] font-extrabold">"{query}"</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#4B41E1]/15 text-[#4B41E1] dark:text-[#818CF8]">
                {totalMatches} {totalMatches === 1 ? 'match' : 'matches'}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-xs cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 custom-scrollbar">
            {isLoading && results.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 text-[#4B41E1] animate-spin" />
                <span className="text-xs font-medium">Searching college knowledge base...</span>
              </div>
            ) : results.length > 0 ? (
              results.map((item) => (
                <div
                  key={item.chunk_id}
                  className="p-3 sm:p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#4B41E1]/50 bg-white dark:bg-[#161B22] hover:bg-gray-50 dark:hover:bg-[#1F2937] hover:shadow-xs transition-all flex flex-col space-y-2 group"
                >
                  {/* Result Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-[#4B41E1]/15 text-[#4B41E1] dark:text-[#818CF8] flex items-center justify-center flex-shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate group-hover:text-[#4B41E1] dark:group-hover:text-[#818CF8] transition-colors">
                        {item.document_name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {item.page_number && (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          Page {item.page_number}
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {item.relevance_percent}% match
                      </span>
                    </div>
                  </div>

                  {/* Matched Excerpt with Highlighting */}
                  <div className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-[#0B0F17] p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 font-normal">
                    <MarkdownContent content={item.matched_excerpt} />
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setSelectedResult(item)}
                      className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-[#4B41E1] dark:hover:text-[#818CF8] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>View context</span>
                    </button>

                    {onAskQuestion && (
                      <button
                        onClick={() => handleAskAI(item)}
                        className="text-[11px] font-bold text-[#4B41E1] dark:text-[#818CF8] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Ask Vibrant AI</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-gray-400 dark:text-gray-500 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 mx-auto flex items-center justify-center">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">No exact matches found</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Try searching for keywords like "fee", "hostel", "CSE syllabus", or "admission".
                </p>

                {onAskQuestion && (
                  <button
                    onClick={() => {
                      onAskQuestion(query);
                      setIsOpen(false);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#4B41E1] text-white text-xs font-bold shadow-xs hover:bg-[#3b32c4] transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ask AI this question</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer with suggestions */}
          <div className="p-2.5 sm:px-4 sm:py-2.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0B0F17] flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium hidden sm:inline">
              Quick search:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['B.Tech CSE Fee', 'Hostel Curfew', 'Scholarships', 'Exam Calendar'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleQuickChip(chip)}
                  className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-[#4B41E1] hover:border-[#4B41E1]/40 transition-all cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Context Modal Popover */}
      {selectedResult && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={() => setSelectedResult(null)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-[#0B0F17]">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-xl bg-[#4B41E1]/15 text-[#4B41E1] dark:text-[#818CF8] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
                    {selectedResult.document_name}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate block">
                    {selectedResult.page_number ? `Page ${selectedResult.page_number} • ` : ''} Chunk ID: {selectedResult.chunk_id.slice(0, 8)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedResult(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-mono text-xs sm:text-[13px] leading-relaxed text-gray-800 dark:text-gray-200 bg-white dark:bg-[#111827] custom-scrollbar">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#0B0F17] border border-gray-200 dark:border-gray-800 whitespace-pre-wrap selection:bg-[#4B41E1]/20">
                {selectedResult.full_content || selectedResult.raw_excerpt || selectedResult.matched_excerpt}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:px-6 sm:py-3.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0B0F17] flex items-center justify-between">
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                Relevance match: {selectedResult.relevance_percent}%
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedResult(null)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                >
                  Close
                </button>

                {onAskQuestion && (
                  <button
                    onClick={() => {
                      handleAskAI(selectedResult);
                      setSelectedResult(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#4B41E1] hover:bg-[#3b32c4] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ask AI About This</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
