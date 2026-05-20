import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown ignores raw HTML by default, so user input is safe.
export function Markdown({ source }: { source: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:tracking-tight prose-a:underline">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}
