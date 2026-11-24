import { useEffect, useRef, useState } from 'react';

interface SearchBoxProps {
  value: string;
  onChange: (q: string) => void;
  placeholder?: string;
}

export function SearchBox({ value, onChange, placeholder = 'Search' }: SearchBoxProps) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setLocal(value), [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v.trim()), 300);
  };

  return (
    <div className="flex items-center gap-2 rounded-full bg-[#F4F5F7] px-3.5 py-1.5 w-full max-w-xl">
      <SearchIcon />
      <input
        type="search"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-xs text-primary placeholder:text-muted focus:outline-none"
      />
      <FilterIcon />
      <RefreshIcon />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-muted shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg className="h-3 w-3 text-muted shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-3 w-3 text-muted shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.75a.75.75 0 00-.75.75v4.482a.75.75 0 001.5 0v-2.148l.443.443a7 7 0 0011.83-3.238.75.75 0 00-1.461-.444zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311H11.77a.75.75 0 000 1.5h4.482a.75.75 0 00.75-.75V2.689a.75.75 0 00-1.5 0v2.148l-.443-.443a7 7 0 00-11.83 3.238.75.75 0 001.461.444z" clipRule="evenodd" />
    </svg>
  );
}
