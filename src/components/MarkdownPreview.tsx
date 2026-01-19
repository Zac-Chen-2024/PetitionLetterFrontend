'use client';

import { useState, useMemo } from 'react';

interface MarkdownPreviewProps {
  content: string;
  title?: string;
  maxHeight?: string;
  showCopyButton?: boolean;
}

// Simple Markdown parser for basic formatting
function parseMarkdown(text: string): string {
  if (!text) return '';

  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold text-gray-900 mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold text-gray-900 mt-5 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold text-gray-900 mt-6 mb-3">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/__(.*?)__/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/_(.*?)_/g, '<em class="italic">$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-sm font-mono"><code>$1</code></pre>')
    // Inline code
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>')
    // Unordered lists
    .replace(/^\s*[-*+]\s+(.*$)/gm, '<li class="ml-4 text-gray-700">$1</li>')
    // Ordered lists
    .replace(/^\s*\d+\.\s+(.*$)/gm, '<li class="ml-4 text-gray-700 list-decimal">$1</li>')
    // Blockquotes
    .replace(/^>\s+(.*$)/gm, '<blockquote class="border-l-4 border-blue-300 pl-4 py-1 my-2 text-gray-600 italic">$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-4 border-gray-200" />')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Line breaks - convert double newlines to paragraphs
    .replace(/\n\n/g, '</p><p class="my-2 text-gray-700">')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br />');

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<h') && !html.startsWith('<pre') && !html.startsWith('<ul') && !html.startsWith('<ol') && !html.startsWith('<blockquote')) {
    html = `<p class="my-2 text-gray-700">${html}</p>`;
  }

  // Wrap consecutive list items in ul
  html = html.replace(/(<li class="ml-4 text-gray-700">.*?<\/li>)+/g, '<ul class="my-2 list-disc">$&</ul>');
  html = html.replace(/(<li class="ml-4 text-gray-700 list-decimal">.*?<\/li>)+/g, '<ol class="my-2 list-decimal">$&</ol>');

  return html;
}

// Copy icon
const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ExpandIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const CollapseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
  </svg>
);

export default function MarkdownPreview({
  content,
  title = 'OCR 结果预览',
  maxHeight = '300px',
  showCopyButton = true,
}: MarkdownPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse markdown content
  const parsedHtml = useMemo(() => parseMarkdown(content), [content]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!content) {
    return (
      <div className="border border-gray-200 rounded-lg bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">暂无 OCR 结果</p>
        <p className="text-xs text-gray-400 mt-1">选择一个已完成 OCR 的文件查看结果</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <div className="flex items-center gap-1">
          {showCopyButton && (
            <button
              onClick={handleCopy}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
              title={copied ? '已复制' : '复制内容'}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="p-4 bg-white overflow-y-auto prose prose-sm max-w-none"
        style={{ maxHeight: isExpanded ? 'none' : maxHeight }}
        dangerouslySetInnerHTML={{ __html: parsedHtml }}
      />

      {/* Fade gradient when collapsed and content overflows */}
      {!isExpanded && content.length > 500 && (
        <div className="h-8 bg-gradient-to-t from-white to-transparent -mt-8 relative pointer-events-none" />
      )}
    </div>
  );
}
