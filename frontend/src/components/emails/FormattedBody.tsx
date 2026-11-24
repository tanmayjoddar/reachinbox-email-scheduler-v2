interface FormattedBodyProps {
  content: string;
}

export function FormattedBody({ content }: FormattedBodyProps) {
  if (!content) return null;

  // Split content by lines/paragraphs
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let blockquoteBuffer: string[] = [];

  const flushBlockquote = (key: number) => {
    if (blockquoteBuffer.length === 0) return;
    const text = blockquoteBuffer.join(' ');
    renderedElements.push(
      <div
        key={`bq-${key}`}
        className="rounded-md border-l-4 border-amber-400 bg-amber-50/70 p-3.5 text-xs text-amber-950 my-3 font-medium space-y-1"
      >
        <span className="text-amber-500 mr-1.5 font-bold">⚡</span>
        {renderInlineFormatting(text)}
      </div>,
    );
    blockquoteBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('>')) {
      blockquoteBuffer.push(line.replace(/^>\s*/, ''));
      continue;
    } else {
      flushBlockquote(i);
    }

    if (line.startsWith('## ') || line.startsWith('# ')) {
      const headingText = line.replace(/^#+\s*/, '');
      renderedElements.push(
        <h3 key={i} className="text-sm font-bold text-primary pt-2 pb-1">
          {renderInlineFormatting(headingText)}
        </h3>,
      );
      continue;
    }

    if (line.startsWith('• ') || line.startsWith('- ')) {
      renderedElements.push(
        <li key={i} className="ml-4 list-disc text-xs text-primary/90">
          {renderInlineFormatting(line.replace(/^[•-]\s*/, ''))}
        </li>,
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      renderedElements.push(
        <li key={i} className="ml-4 list-decimal text-xs text-primary/90">
          {renderInlineFormatting(line.replace(/^\d+\.\s*/, ''))}
        </li>,
      );
      continue;
    }

    if (!line.trim()) {
      renderedElements.push(<div key={i} className="h-2" />);
      continue;
    }

    renderedElements.push(
      <p key={i} className="text-xs text-primary/90 leading-relaxed">
        {renderInlineFormatting(line)}
      </p>,
    );
  }

  flushBlockquote(lines.length);

  return <div className="space-y-1.5 text-xs text-secondary">{renderedElements}</div>;
}

function renderInlineFormatting(text: string): React.ReactNode {
  // Replace HTML tags & markdown markers safely
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Regex matching bold, italic, underline, strikethrough, or html tags
  const regex = /(\*\*[^*]+\*\*|<u>[^<]+<\/u>|\*[^*]+\*|~~[^~]+~~|<b>[^<]+<\/b>|<i>[^<]+<\/i>)/;

  while (remaining) {
    const match = remaining.match(regex);
    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }

    if (match.index > 0) {
      parts.push(remaining.slice(0, match.index));
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      parts.push(<strong key={key++} className="font-bold text-primary">{matchedStr.slice(2, -2)}</strong>);
    } else if (matchedStr.startsWith('<b>') && matchedStr.endsWith('</b>')) {
      parts.push(<strong key={key++} className="font-bold text-primary">{matchedStr.slice(3, -4)}</strong>);
    } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      parts.push(<em key={key++} className="italic text-primary">{matchedStr.slice(1, -1)}</em>);
    } else if (matchedStr.startsWith('<i>') && matchedStr.endsWith('</i>')) {
      parts.push(<em key={key++} className="italic text-primary">{matchedStr.slice(3, -4)}</em>);
    } else if (matchedStr.startsWith('<u>') && matchedStr.endsWith('</u>')) {
      parts.push(<span key={key++} className="underline text-primary">{matchedStr.slice(3, -4)}</span>);
    } else if (matchedStr.startsWith('~~') && matchedStr.endsWith('~~')) {
      parts.push(<span key={key++} className="line-through text-muted">{matchedStr.slice(2, -2)}</span>);
    } else {
      parts.push(matchedStr);
    }

    remaining = remaining.slice(match.index + matchedStr.length);
  }

  return parts;
}
