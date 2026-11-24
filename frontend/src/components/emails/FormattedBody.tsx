interface FormattedBodyProps {
  content: string;
}

export function FormattedBody({ content }: FormattedBodyProps) {
  if (!content) return null;

  const hasHtml = /<[a-z][\s\S]*>/i.test(content);

  if (hasHtml) {
    return (
      <div
        className="rich-text-content space-y-1.5 text-xs text-secondary leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
      />
    );
  }

  return (
    <div
      className="rich-text-content space-y-1.5 text-xs text-secondary leading-relaxed"
      dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
    />
  );
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\bjavascript:/gi, '');
}

function markdownToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, '<u>$1</u>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^##\s*(.+)$/gm, '<h3>$1</h3>')
    .replace(/^#\s*(.+)$/gm, '<h2>$1</h2>')
    .replace(/^•\s*(.+)$/gm, '<ul><li>$1</li></ul>')
    .replace(/\n/g, '<br/>');
}
