import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Luxury-themed markdown renderer for chat + crew agent output.
const components = {
  h1: (p) => (
    <h1 className="h-display text-2xl text-peter-ivory mt-3 mb-2" {...p} />
  ),
  h2: (p) => (
    <h2 className="h-display text-xl text-peter-ivory mt-3 mb-2" {...p} />
  ),
  h3: (p) => (
    <h3 className="text-base font-medium text-peter-goldLight mt-3 mb-1 tracking-wide" {...p} />
  ),
  h4: (p) => (
    <h4 className="text-sm font-semibold text-peter-goldLight mt-2 mb-1 uppercase tracking-widest" {...p} />
  ),
  p: (p) => <p className="my-2 leading-relaxed text-peter-ivory/90" {...p} />,
  a: (p) => (
    <a
      className="text-peter-gold underline decoration-peter-gold/40 hover:decoration-peter-gold transition-colors"
      target="_blank"
      rel="noreferrer"
      {...p}
    />
  ),
  ul: (p) => <ul className="list-disc list-outside ml-5 my-2 space-y-1" {...p} />,
  ol: (p) => <ol className="list-decimal list-outside ml-5 my-2 space-y-1" {...p} />,
  li: (p) => <li className="text-peter-ivory/90 leading-relaxed" {...p} />,
  strong: (p) => <strong className="text-peter-ivory font-semibold" {...p} />,
  em: (p) => <em className="text-peter-goldLight not-italic font-medium" {...p} />,
  blockquote: (p) => (
    <blockquote
      className="border-l-2 border-peter-gold/50 pl-4 my-3 text-peter-ivory/80 italic"
      {...p}
    />
  ),
  hr: () => <hr className="my-4 border-0 hairline" />,
  code: ({ inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-peter-black/60 border border-peter-gold/15 text-peter-goldLight text-[0.9em] font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre className="my-3 p-4 rounded-md bg-peter-black/70 border border-peter-gold/15 overflow-x-auto">
        <code className="text-xs font-mono text-peter-ivory/90 leading-relaxed" {...props}>
          {children}
        </code>
      </pre>
    );
  },
  table: (p) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full text-xs border border-peter-gold/15" {...p} />
    </div>
  ),
  thead: (p) => <thead className="bg-peter-navy2/60" {...p} />,
  th: (p) => (
    <th
      className="text-left px-3 py-2 border-b border-peter-gold/15 text-peter-dim uppercase tracking-widest text-[10px]"
      {...p}
    />
  ),
  td: (p) => (
    <td className="px-3 py-2 border-b border-peter-gold/10 text-peter-ivory/90" {...p} />
  ),
};

export default function Markdown({ children }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children || ""}
      </ReactMarkdown>
    </div>
  );
}
