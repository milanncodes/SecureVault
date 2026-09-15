import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  return (
    <div
      className="prose prose-slate max-w-none prose-headings:border-b prose-headings:border-slate-200 prose-headings:pb-2 prose-h1:text-2xl prose-h1:font-semibold prose-h1:text-slate-900 prose-h2:text-xl prose-h2:font-semibold prose-h2:text-slate-900 prose-h3:text-lg prose-h3:font-semibold prose-h3:text-slate-900 prose-p:text-slate-700 prose-a:text-blue-600 hover:prose-a:underline prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:text-slate-800 prose-li:text-slate-700 prose-strong:text-slate-900"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
};
