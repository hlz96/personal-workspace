import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface Props {
  content: string;
  className?: string;
}

export function MarkdownView({ content, className }: Props) {
  return (
    <div
      className={cn(
        'markdown-body text-sm leading-relaxed',
        'text-[rgb(var(--fg))]',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-semibold mt-4 mb-2 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mt-4 mb-2 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-3 mb-1.5 first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="my-2 leading-7">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 my-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-7">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-brand-500 underline underline-offset-2 hover:text-brand-600"
            >
              {children}
            </a>
          ),
          code: ({ className: cls, children }) => {
            const isBlock = cls?.startsWith('language-');
            if (isBlock) {
              return (
                <code className={cn('block rounded-lg p-3 my-2 overflow-x-auto', cls)}
                  style={{ background: 'rgb(var(--bg-elev, 0 0 0 / 0.04))' }}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded text-[0.9em]"
                style={{ background: 'rgb(var(--border))' }}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          blockquote: ({ children }) => (
            <blockquote
              className="border-l-4 pl-3 my-2 text-[rgb(var(--muted))] italic"
              style={{ borderColor: 'rgb(var(--border))' }}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table
                className="w-full text-left border-collapse"
                style={{ borderColor: 'rgb(var(--border))' }}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              className="border px-2 py-1.5 font-semibold text-sm"
              style={{ borderColor: 'rgb(var(--border))' }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className="border px-2 py-1.5 text-sm"
              style={{ borderColor: 'rgb(var(--border))' }}
            >
              {children}
            </td>
          ),
          hr: () => <hr className="my-4" style={{ borderColor: 'rgb(var(--border))' }} />,
          input: (props) =>
            props.type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={props.checked ?? false}
                readOnly
                className="mr-1.5 align-middle"
              />
            ) : null,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
