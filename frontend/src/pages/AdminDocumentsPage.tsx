import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/common/Header';
import { DocumentTable } from '../components/admin/DocumentTable';
import { DocumentUploadModal } from '../components/admin/DocumentUploadModal';
import { DocumentDetailModal } from '../components/admin/DocumentDetailModal';
import { Document } from '../types';
import { api } from '../lib/api';
import {
  UploadCloud,
  FileText,
  Search,
  Filter,
  RotateCw,
  Sparkles,
  Layers,
  ArrowLeft,
  Plus,
  Loader2,
  ChevronDown,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await api.admin.listDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReprocess = async (id: string) => {
    setReprocessingId(id);
    try {
      await api.admin.reprocessDocument(id);
      await loadDocuments();
    } catch (err) {
      console.error('Reprocess failed', err);
    } finally {
      setReprocessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Permanently delete this document and all its vector embeddings?')) {
      setDeletingId(id);
      try {
        await api.admin.deleteDocument(id);
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      } catch (err) {
        console.error('Delete failed', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-chat-canvas dark:bg-[#0B0F17] flex flex-col transition-colors relative">
      {/* PROMINENT CENTER TOP LOADING INDICATOR */}
      {isLoading && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-2 border-[#4B41E1] dark:border-[#818CF8] shadow-2xl text-gray-900 dark:text-white font-extrabold text-sm tracking-wide">
            <Loader2 className="w-5 h-5 animate-spin text-[#4B41E1] dark:text-[#818CF8]" />
            <span>Loading...</span>
          </div>
        </div>
      )}

      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
        {/* Top Header with Upload Document Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="space-y-1">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4B41E1] hover:underline mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Admin Analytics</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Document Vault
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-2xl">
              Upload college documents (PDF, DOCX, TXT). Chunks and vector embeddings are automatically created and indexed for RAG.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={loadDocuments}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors shadow-xs cursor-pointer"
              title="Refresh Documents"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#4B41E1]' : ''}`} />
            </button>

            {/* Prominent Upload Document Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2.5 px-6 py-3 sm:px-7 sm:py-3.5 rounded-xl bg-[#4B41E1] hover:bg-[#3b32c4] text-white font-extrabold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-card-clean">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search document catalog..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B41E1]/30 focus:bg-white dark:focus:bg-gray-800"
            />
          </div>

          {/* Custom Status Filter Dropdown */}
          <div className="relative w-full sm:w-auto" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2.5 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[#4B41E1]" />
                <span>
                  {statusFilter === 'ALL' && `All Statuses (${documents.length})`}
                  {statusFilter === 'READY' && 'Ready / Indexed'}
                  {statusFilter === 'PROCESSING' && 'Processing'}
                  {statusFilter === 'FAILED' && 'Failed'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isFilterOpen ? 'rotate-180 text-[#4B41E1]' : ''}`} />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700/80 shadow-2xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Filter by Status
                </div>
                <div className="space-y-0.5">
                  {[
                    { value: 'ALL', label: `All Statuses (${documents.length})`, dot: 'bg-gray-400' },
                    { value: 'READY', label: 'Ready / Indexed', dot: 'bg-emerald-500' },
                    { value: 'PROCESSING', label: 'Processing Queue', dot: 'bg-amber-500' },
                    { value: 'FAILED', label: 'Failed Ingestions', dot: 'bg-rose-500' },
                  ].map((opt) => {
                    const isSelected = statusFilter === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setStatusFilter(opt.value);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-[#4B41E1] text-white shadow-xs'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#4B41E1] dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : opt.dot}`} />
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Document Table with Custom Scrollbar */}
        <DocumentTable
          documents={filteredDocs}
          onViewDetail={(doc) => setSelectedDoc(doc)}
          onReprocess={handleReprocess}
          onDelete={handleDelete}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          reprocessingId={reprocessingId}
          deletingId={deletingId}
        />
      </main>

      {/* Upload Modal with Auto-Chunking */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => loadDocuments()}
      />

      {/* Detail Inspector Modal with Close Button */}
      <DocumentDetailModal
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />
    </div>
  );
};
