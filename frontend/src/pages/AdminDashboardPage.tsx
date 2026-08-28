import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { AnalyticsCards } from '../components/admin/AnalyticsCards';
import { DocumentTable } from '../components/admin/DocumentTable';
import { DocumentUploadModal } from '../components/admin/DocumentUploadModal';
import { DocumentDetailModal } from '../components/admin/DocumentDetailModal';
import { Document, AnalyticsData } from '../types';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { generateAndDownloadAdminReportPdf, generateAndDownloadAdminCsv } from '../lib/pdfExport';
import {
  UploadCloud,
  FileText,
  RotateCw,
  Sparkles,
  Layers,
  ArrowUpRight,
  Shield,
  Download,
  Printer,
  FileSpreadsheet,
  FileDown,
  Loader2
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { isDark } = useTheme();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [analyticsData, docsData] = await Promise.all([
        api.admin.getAnalytics(),
        api.admin.listDocuments(),
      ]);
      setAnalytics(analyticsData);
      setDocuments(docsData);
    } catch (err) {
      console.error('Failed to load admin dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Direct In-Memory CSV Export (Guarantees zero blank/black tabs)
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      // Try backend endpoint first if available
      try {
        const blob = await api.admin.exportAnalyticsCsv();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `college_rag_audit_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (beErr) {
        console.warn('Backend CSV endpoint unreachable, falling back to comprehensive client CSV generator', beErr);
        generateAndDownloadAdminCsv(analytics, documents);
      }
    } catch (err: any) {
      console.error('Export CSV failed', err);
      // Client CSV fallback
      generateAndDownloadAdminCsv(analytics, documents);
    } finally {
      setIsExporting(false);
    }
  };

  // Download Comprehensive Admin Report as PDF in matching Dark/Light Theme
  const handleDownloadPdfReport = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateAndDownloadAdminReportPdf(analytics, documents, isDark);
    } catch (err) {
      console.error('PDF Report generation failed', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleReprocess = async (id: string) => {
    setReprocessingId(id);
    try {
      await api.admin.reprocessDocument(id);
      await loadDashboardData();
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
        if (analytics) {
          setAnalytics({ ...analytics, total_documents: analytics.total_documents - 1 });
        }
      } catch (err) {
        console.error('Delete failed', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

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

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-200">
        {/* Page Hero Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#4B41E1]/10 text-[#4B41E1] font-bold uppercase tracking-wider">
                Management Console
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">MongoDB Atlas Grounding</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Knowledge Administration
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Export CSV Audit Button */}
            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 active:scale-95"
              title="Download full RAG query audit log and document inventory as CSV"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#4B41E1]" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-[#4B41E1]" />
              )}
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            {/* Download Report in PDF Button (Replaces print window) */}
            <button
              onClick={handleDownloadPdfReport}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111827] hover:bg-[#4B41E1]/10 dark:hover:bg-[#4B41E1]/20 hover:text-[#4B41E1] dark:hover:text-[#818CF8] text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 active:scale-95"
              title="Download official administration analytics report as PDF in active theme"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#4B41E1]" />
              ) : (
                <FileDown className="w-4 h-4 text-[#4B41E1]" />
              )}
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Report (PDF)'}</span>
            </button>

            <button
              onClick={loadDashboardData}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors shadow-xs cursor-pointer"
              title="Refresh Dashboard"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#4B41E1]' : ''}`} />
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4B41E1] hover:bg-[#3b32c4] text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Ingest Document</span>
            </button>
          </div>
        </div>

        {/* Section 1: Top Metrics Cards */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Platform Health & Performance Metrics
            </h2>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Atlas Sync Active
            </span>
          </div>
          <AnalyticsCards analytics={analytics} isLoading={isLoading} />
        </section>

        {/* Section 2: Document Management Table */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
                Document Vault
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Uploaded campus institutional policies, academic calendars, and fee schedules.
              </p>
            </div>
            <Link
              to="/admin/documents"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4B41E1] hover:text-[#3b32c4] dark:text-[#818CF8] transition-colors"
            >
              <span>View Full Document Catalog</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <DocumentTable
            documents={documents}
            onViewDetail={(doc) => setSelectedDoc(doc)}
            onReprocess={handleReprocess}
            onDelete={handleDelete}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            reprocessingId={reprocessingId}
            deletingId={deletingId}
          />
        </section>
      </main>

      {/* Upload Document Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={loadDashboardData}
      />

      {/* Vector Chunks Inspector Modal */}
      <DocumentDetailModal
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />
    </div>
  );
};
