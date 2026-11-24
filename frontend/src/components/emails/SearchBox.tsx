import { useEffect, useRef, useState } from 'react';

interface SearchBoxProps {
  value: string;
  onChange: (q: string) => void;
  placeholder?: string;
  onRefresh?: () => void;
}

export function SearchBox({ value, onChange, placeholder = 'Search', onRefresh }: SearchBoxProps) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setLocal(value), [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v.trim()), 300);
  };

  return (
    <div className="flex items-center gap-4 w-full max-w-[1180px]">
      {/* 1180 fill into 58 hug search bar */}
      <div className="flex-1 h-[58px] rounded-full bg-[#F4F5F7] px-6 flex items-center gap-3 shadow-none">
        <SearchIcon />
        <input
          type="search"
          value={local}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
        />
      </div>

      {/* Filter funnel and refresh outside of the search bar, beside it */}
      <div className="flex items-center gap-3 shrink-0 text-muted">
        <button
          type="button"
          className="p-1.5 hover:text-primary transition-colors"
          aria-label="Filter"
        >
          <FilterIcon />
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="p-1.5 hover:text-primary transition-colors"
          aria-label="Refresh"
        >
          <RefreshIcon />
        </button>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4 text-muted shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg className="h-4 w-4 text-muted hover:text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-4 w-4 text-muted hover:text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}
