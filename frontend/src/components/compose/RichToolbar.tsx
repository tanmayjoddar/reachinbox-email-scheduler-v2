interface RichToolbarProps {
  onFormat: (command: string, value?: string) => void;
}

export function RichToolbar({ onFormat }: RichToolbarProps) {
  const btn = 'p-1 rounded hover:bg-[#E8E9EB] text-muted hover:text-primary transition-colors cursor-pointer select-none';
  const sep = 'w-px h-4 bg-border-dark mx-0.5';

  const handleAction = (e: React.MouseEvent, cmd: string, val?: string) => {
    e.preventDefault();
    onFormat(cmd, val);
  };

  return (
    <div className="rounded-xl bg-white shadow-sm border border-border-dark px-3 py-1.5 flex items-center gap-1 text-sm text-muted flex-wrap">
      {/* Undo / Redo */}
      <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleAction(e, 'undo')} title="Undo"><UndoIcon /></button>
      <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleAction(e, 'redo')} title="Redo"><RedoIcon /></button>

      {/* Font Size */}
      <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleAction(e, 'fontSize')} title="Font Size / Heading">
        <span className="text-xs font-semibold text-primary flex items-center">T<span className="text-[8px] ml-px">↕</span></span>
      </button>

      <div className={sep} />

      {/* Bold / Italic / Underline */}
      <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleAction(e, 'bold')} title="Bold">
        <span className="font-bold text-sm">B</span>
      </button>
      <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleAction(e, 'italic')} title="Italic">
        <span className="italic text-sm">I</span>
      </button>
      <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleAction(e, 'underline')} title="Underline">
        <span className="underline text-sm">U</span>
      </button>

      {/* Text Align */}
      <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleAction(e, 'align')} title="Text Alignment">
        <AlignIcon />
      </button>

      <div className={sep} />

      {/* Ordered List */}
      <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleAction(e, 'orderedList')} title="Ordered List">
        <OrderedListIcon />
      </button>
      {/* Unordered List */}
      <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleAction(e, 'unorderedList')} title="Unordered List">
        <UnorderedListIcon />
      </button>

      {/* Indent / Outdent */}
      <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleAction(e, 'indent')} title="Indent">
        <IndentIcon />
      </button>
      <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleAction(e, 'outdent')} title="Outdent">
        <OutdentIcon />
      </button>

      <div className={sep} />

      {/* Blockquote */}
      <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleAction(e, 'blockquote')} title="Blockquote">
        <BlockquoteIcon />
      </button>
      {/* Strikethrough */}
      <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleAction(e, 'strikethrough')} title="Strikethrough">
        <StrikethroughIcon />
      </button>
    </div>
  );
}

function UndoIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
    </svg>
  );
}

function AlignIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M3 6h18M3 10h12M3 14h18M3 18h12" />
    </svg>
  );
}

function OrderedListIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M10 6h11M10 12h11M10 18h11" />
      <text x="3" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">1.</text>
      <text x="3" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">2.</text>
      <text x="3" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">3.</text>
    </svg>
  );
}

function UnorderedListIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M10 6h11M10 12h11M10 18h11" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IndentIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M3 6h18M11 10h10M11 14h10M3 18h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l4 2-4 2" />
    </svg>
  );
}

function OutdentIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M3 6h18M11 10h10M11 14h10M3 18h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 10l-4 2 4 2" />
    </svg>
  );
}

function BlockquoteIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
    </svg>
  );
}

function StrikethroughIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M3 12h18" />
      <path strokeLinecap="round" d="M16 6c-.5-1.5-2-2.5-4-2.5-2.5 0-4 1.5-4 3.5 0 1 .5 1.8 1.5 2.5" />
      <path strokeLinecap="round" d="M8 18c.5 1.5 2 2.5 4 2.5 2.5 0 4-1.5 4-3.5 0-1-.5-1.8-1.5-2.5" />
    </svg>
  );
}
