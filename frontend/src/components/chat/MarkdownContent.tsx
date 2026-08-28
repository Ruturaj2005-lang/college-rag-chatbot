import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
}

/**
 * Normalizes raw response text into clean GitHub-flavored Markdown:
 * - Inserts double newlines before all headings (H1-H6) even if concatenated without spaces
 * - Ensures space after '#' markers (e.g. "##1. Fees" -> "## 1. Fees")
 * - Converts bullet points onto distinct newlines (e.g. "something - item" -> "something\n\n- item")
 * - Strips trailing unclosed section headers at chunk boundaries
 */
function preprocessMarkdown(raw: string): string {
  if (!raw) return '';

  let text = String(raw).trim();

  // 1. Replace literal escaped newlines if present
  text = text.replace(/\\n/g, '\n');

  // 2. Fix headings without space after '#' (e.g. "##1. Heading" -> "## 1. Heading")
  text = text.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');
  text = text.replace(/([^\n])\s*(#{1,6})([^\s#])/g, '$1\n\n$2 $3');

  // 3. Ensure double newlines before all Markdown headings (H1 to H6)
  text = text.replace(/([^\n])\s*(#{1,6}\s+[^\n]+)/g, '$1\n\n$2\n');

  // 4. Ensure double newlines before numbered major sections like "1. Title", "2. Title"
  text = text.replace(/([^\n])\s+(\d+\.\s+[A-Z][A-Za-z0-9\s&/()–—,-]{3,}:?)/g, '$1\n\n$2\n');

  // 5. Ensure bullet items start on their own lines
  text = text.replace(/([^\n])\s+-\s+(\*\*|[A-Z0-9₹$*–—(])/g, '$1\n\n- $2');
  text = text.replace(/([^\n])\s*[•*]\s+(\*\*|[A-Z0-9₹$*–—(])/g, '$1\n\n- $2');

  // 6. Handle repeated compressed list items on a single line
  for (let i = 0; i < 5; i++) {
    text = text.replace(/(\n-[^\n]+?)\s+-\s+(\*\*|[A-Z0-9₹$*–—(])/g, '$1\n- $2');
  }

  // 7. Remove any trailing dangling section header with no content at the end of a chunk
  text = text.replace(/\n*#{1,6}\s+([0-9]+\.\s+[^\n]+)\s*$/g, '');
  text = text.replace(/\n*#{1,6}\s*$/g, '');

  return text.trim();
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  const formattedContent = useMemo(() => preprocessMarkdown(content), [content]);

  return (
    <div className="prose-chat text-[#171717] leading-relaxed max-w-none antialiased">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-[20px] sm:text-[22px] font-bold text-[#111111] tracking-tight mt-6 mb-3 pb-2 border-b border-[#e5e5e5] leading-snug first:mt-0" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-[18px] sm:text-[19px] font-bold text-[#111111] tracking-tight mt-5 mb-2.5 leading-snug first:mt-0" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-[16px] sm:text-[17px] font-bold text-[#111111] mt-4 mb-2 leading-snug first:mt-0" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-[15px] font-bold text-[#111111] mt-3 mb-1.5 leading-snug" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="text-[15px] sm:text-[16px] leading-[1.7] text-[#171717] font-normal mb-3.5 last:mb-0" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside pl-6 space-y-2 my-3 text-[15px] sm:text-[16px] leading-[1.65] text-[#171717] marker:text-[#444444]" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside pl-6 space-y-2 my-3 text-[15px] sm:text-[16px] leading-[1.65] text-[#171717] marker:text-[#444444]" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-[#171717] pl-1" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-[#111111]" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="text-[#333333] italic" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-[#d1d5db] pl-4 py-2 my-3.5 bg-[#f9fafb] rounded-r-lg text-[14px] text-[#4b5563] italic" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-[#e5e5e5] bg-[#ffffff] shadow-xs">
              <table className="min-w-full divide-y divide-[#e5e5e5] text-left text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-[#f9fafb] text-[#111111] font-bold text-xs uppercase tracking-wider border-b border-[#e5e5e5]" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-[#f0f0f0] bg-[#ffffff]" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-[#fafafa] transition-colors" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-3 font-bold text-[#111111]" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-3 text-[#171717] leading-normal" {...props} />
          ),
          code: ({ node, ...props }) => (
            <code className="px-1.5 py-0.5 rounded bg-[#f3f4f6] text-[#111111] font-mono text-[0.88em] border border-[#e5e7eb] font-medium" {...props} />
          ),
          hr: () => (
            <hr className="my-4 border-t border-[#e5e5e5]" />
          ),
        }}
      >
        {formattedContent}
      </ReactMarkdown>
    </div>
  );
};
