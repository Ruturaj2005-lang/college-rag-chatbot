import React, { useState } from 'react';
import { api } from '../../lib/api';
import { Document } from '../../types';
import {
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileCheck,
  Layers,
  Sparkles
} from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (doc: Document) => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    const validExtensions = ['.pdf', '.docx', '.txt'];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(ext)) {
      setError('Supported file formats: PDF, DOCX, or TXT.');
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setError('Maximum file size is 25MB.');
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const createdDoc = await api.admin.uploadDocument(file);
      onUploadSuccess(createdDoc);
      onClose();
    } catch (err: any) {
      console.error('Upload error', err);
      setError(err.message || 'Failed to process and index document.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4B41E1]/30 border border-[#4B41E1]/40 text-[#a5b4fc] flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Upload College Document
              </h3>
              <p className="text-xs text-gray-300">
                PDF, DOCX, or TXT (Automatic Chunk Creation)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragActive
                ? 'border-[#4B41E1] bg-[#4B41E1]/10'
                : 'border-gray-300 dark:border-gray-700 hover:border-[#4B41E1] dark:hover:border-[#4B41E1] bg-gray-50/50 dark:bg-[#0B0F17]'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.docx,.txt"
              onChange={handleChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer block space-y-2.5">
              <UploadCloud className="w-10 h-10 mx-auto text-[#4B41E1] dark:text-[#818CF8]" />
              <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                <span className="font-bold text-[#4B41E1] dark:text-[#818CF8] hover:underline">
                  Click to select file
                </span>{' '}
                or drag and drop here
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Official syllabus, fee structures, hostel rules, or academic calendars
              </p>
            </label>
          </div>

          {/* Automatic Chunking Info Pill */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-[#0B0F17] border border-gray-200 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-300">
            <Layers className="w-4 h-4 text-[#4B41E1] dark:text-[#818CF8] flex-shrink-0" />
            <span>
              Document will be automatically tokenized into <strong>500-token vector chunks</strong> with embeddings stored in MongoDB Atlas.
            </span>
          </div>

          {/* Selected File Card */}
          {file && (
            <div className="p-3.5 rounded-xl bg-[#4B41E1]/10 dark:bg-[#4B41E1]/20 border border-[#4B41E1]/30 flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileCheck className="w-4 h-4 text-[#4B41E1] dark:text-[#818CF8] flex-shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold text-gray-900 dark:text-white block truncate">{file.name}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || isUploading}
              className="flex items-center gap-2 px-6 py-3 sm:px-7 sm:py-3.5 rounded-xl bg-[#4B41E1] hover:bg-[#3b32c4] text-white font-extrabold text-xs sm:text-sm transition-all shadow-md disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing & Creating Chunks...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload & Create Chunks</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
