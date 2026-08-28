import React, { useState } from 'react';
import { Document } from '../../types';
import { api } from '../../lib/api';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Trash2,
  Eye,
  Layers,
  UploadCloud,
  Download,
  Loader2
} from 'lucide-react';

interface DocumentTableProps {
  documents: Document[];
  onViewDetail: (doc: Document) => void;
  onReprocess: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenUpload?: () => void;
  reprocessingId: string | null;
  deletingId: string | null;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  onViewDetail,
  onReprocess,
  onDelete,
  onOpenUpload,
  reprocessingId,
  deletingId,
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (e: React.MouseEvent, doc: Document) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloadingId(doc.id);
    try {
      await api.documents.download(doc.id, doc.file_name);
    } catch (err: any) {
      console.error('Download failed', err);
      // Fallback: direct window open with query token
      const url = api.documents.downloadUrl(doc.id);
      window.open(url, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Ready / Indexed</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Processing</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold border border-gray-200 dark:border-gray-700">
            <span>{status}</span>
          </span>
        );
    }
  };

  const getFormatBadge = (fileType: string) => {
    const ext = fileType.toUpperCase();
    let colorClass = 'bg-[#4B41E1]/10 dark:bg-[#4B41E1]/20 text-[#4B41E1] dark:text-[#818CF8] border-[#4B41E1]/20 dark:border-[#4B41E1]/40';
    if (ext === 'PDF') colorClass = 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    if (ext === 'DOCX') colorClass = 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    if (ext === 'TXT') colorClass = 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

    return (
      <span className={`px-2.5 py-0.5 rounded-lg border font-mono text-[10px] font-bold ${colorClass}`}>
        {ext}
      </span>
    );
  };

  return (
    <div className="w-full table-scroll-container max-h-[480px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] shadow-sm">
      <table className="w-full text-left border-collapse min-w-[880px]">
        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-[#0B0F17] backdrop-blur-md">
          <tr className="border-b border-gray-200 dark:border-gray-800 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <th className="px-4 sm:px-6 py-4">Document Title & File</th>
            <th className="px-4 py-4">Format</th>
            <th className="px-4 py-4">Status</th>
            <th className="px-4 py-4">Vector Chunks</th>
            <th className="px-4 py-4">Uploaded</th>
            <th className="px-4 sm:px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-xs text-gray-700 dark:text-gray-300">
          {documents.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">No documents found</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  Upload a PDF, DOCX, or TXT file to automatically create chunks and vector embeddings.
                </p>
                {onOpenUpload && (
                  <button
                    onClick={onOpenUpload}
                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 sm:px-7 sm:py-3.5 rounded-xl bg-[#4B41E1] text-white text-xs sm:text-sm font-extrabold hover:bg-[#3b32c4] transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Upload Document</span>
                  </button>
                )}
              </td>
            </tr>
          ) : (
            documents.map((doc) => (
              <tr
                key={doc.id}
                className="hover:bg-[#4B41E1]/5 dark:hover:bg-[#4B41E1]/15 transition-colors bg-white dark:bg-[#111827]"
              >
                <td className="px-4 sm:px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#4B41E1]/10 dark:bg-[#4B41E1]/20 text-[#4B41E1] dark:text-[#818CF8] border border-[#4B41E1]/20 dark:border-[#4B41E1]/30 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 dark:text-white truncate max-w-xs sm:max-w-md text-xs sm:text-sm">
                        {doc.title || doc.file_name}
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate">
                        {doc.file_name}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  {getFormatBadge(doc.file_type)}
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  {getStatusBadge(doc.status)}
                </td>

                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 font-mono text-gray-800 dark:text-gray-200">
                    <Layers className="w-3.5 h-3.5 text-[#4B41E1] dark:text-[#818CF8]" />
                    <span className="font-bold">{doc.chunk_count}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-[10px]">chunks</span>
                  </div>
                </td>

                <td className="px-4 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                  {new Date(doc.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>

                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Download Source File with Authenticated Handler */}
                    <button
                      onClick={(e) => handleDownload(e, doc)}
                      disabled={downloadingId === doc.id}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 hover:border-[#4B41E1]/50 hover:bg-[#4B41E1]/15 text-gray-600 dark:text-gray-300 hover:text-[#4B41E1] dark:hover:text-[#818CF8] transition-all cursor-pointer inline-flex items-center justify-center disabled:opacity-50"
                      title="Download Source Document"
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4B41E1]" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => onViewDetail(doc)}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 hover:border-[#4B41E1]/50 hover:bg-[#4B41E1]/15 text-gray-600 dark:text-gray-300 hover:text-[#4B41E1] dark:hover:text-[#818CF8] transition-all cursor-pointer"
                      title="Inspect Vector Chunks"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onReprocess(doc.id)}
                      disabled={reprocessingId === doc.id}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 hover:border-amber-400 hover:bg-amber-500/10 text-gray-600 dark:text-gray-300 hover:text-amber-500 transition-all disabled:opacity-50 cursor-pointer"
                      title="Reprocess Vector Pipeline"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${reprocessingId === doc.id ? 'animate-spin text-amber-500' : ''}`} />
                    </button>

                    <button
                      onClick={() => onDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 hover:border-rose-400 hover:bg-rose-500/10 text-gray-600 dark:text-gray-300 hover:text-rose-500 transition-all disabled:opacity-50 cursor-pointer"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
