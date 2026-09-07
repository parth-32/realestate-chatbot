'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { ExternalLink } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = '',
  isUser = false 
}) => {
  if (isUser) {
    return <div className={`whitespace-pre-wrap ${className}`}>{content}</div>;
  }

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}

        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-lg font-bold text-[#f3e5ab] mt-3 mb-2 font-display flex items-center gap-2 border-b border-[#D4AF37]/20 pb-1" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-base font-semibold text-[#f8fafc] mt-3 mb-1.5 font-display flex items-center gap-2" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-sm font-semibold text-[#f3e5ab] mt-2.5 mb-1 flex items-center gap-1.5" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-xs font-semibold text-slate-200 mt-2 mb-1" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="text-sm text-slate-200 leading-relaxed mb-2.5 last:mb-0" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-white tracking-wide" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-slate-300" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside pl-4 mb-2.5 space-y-1 text-slate-300 text-sm" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside pl-4 mb-2.5 space-y-1 text-slate-300 text-sm" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-sm text-slate-300 leading-relaxed pl-0.5 marker:text-[#D4AF37]" {...props} />
          ),
          a: ({ node, href, children, ...props }) => {
            const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-1 text-[#D4AF37] hover:text-[#f3e5ab] underline underline-offset-4 decoration-[#D4AF37]/40 hover:decoration-[#D4AF37] font-medium transition duration-200"
                {...props}
              >
                <span>{children}</span>
                {isExternal && <ExternalLink className="w-3 h-3 inline-block shrink-0 opacity-80" />}
              </a>
            );
          },
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-2 border-[#D4AF37] pl-3 py-1 my-2 text-slate-400 italic bg-[#D4AF37]/5 rounded-r" {...props} />
          ),
          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');
            if (isInline) {
              return (
                <code className="font-mono text-xs bg-[#0b0f19] text-[#f3e5ab] px-1.5 py-0.5 rounded border border-[#D4AF37]/20" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <div className="relative my-2 rounded-lg overflow-hidden border border-slate-800 bg-[#070A11]">
                {match && (
                  <div className="text-[10px] uppercase font-mono px-3 py-1 bg-slate-900/80 text-slate-400 border-b border-slate-800">
                    {match[1]}
                  </div>
                )}
                <pre className="p-3 text-xs font-mono text-slate-200 overflow-x-auto">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          table: ({ node, ...props }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-[#D4AF37]/20">
              <table className="w-full text-xs text-left border-collapse" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-[#151D30] text-slate-200 uppercase font-semibold text-[11px]" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-3 py-2 border-b border-slate-700 text-[#f3e5ab]" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3 py-2 border-b border-slate-800/80 text-slate-300" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-3 border-[#D4AF37]/20" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
