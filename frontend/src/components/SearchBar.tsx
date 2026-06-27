import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { SearchResult } from "../types/stocks";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setIsFetching(true);
      api
        .searchStocks(trimmed)
        .then((data) => {
          setResults(data.slice(0, 8));
          setIsOpen(data.length > 0);
          setActiveIndex(-1);
        })
        .catch(() => setResults([]))
        .finally(() => setIsFetching(false));
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function navigateTo(symbol: string) {
    navigate(`/stocks/${symbol}`);
    setQuery("");
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      navigateTo(results[activeIndex].symbol);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search ticker or company…"
          className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-slate-100 dark:bg-navy-800 border border-slate-300 dark:border-navy-600 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-mint/40 focus:border-mint/50 transition-all duration-200"
          aria-label="Search stocks"
          aria-autocomplete="list"
          aria-expanded={isOpen}
        />
        {isFetching && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="block w-3.5 h-3.5 border-2 border-mint/60 border-t-transparent rounded-full animate-spin" />
          </span>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-xl shadow-dark-lg z-50 overflow-hidden animate-slide-up"
        >
          {results.map((r, i) => (
            <li key={r.symbol} role="option" aria-selected={i === activeIndex}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  navigateTo(r.symbol);
                }}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors duration-150 ${
                  i === activeIndex
                    ? "bg-slate-100 dark:bg-navy-700 text-slate-900 dark:text-slate-100"
                    : "hover:bg-slate-50 dark:hover:bg-navy-750 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className="font-semibold text-mint w-14 shrink-0 text-sm">
                  {r.symbol}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-sm truncate flex-1">{r.name}</span>
                <span className="text-xs text-slate-400 dark:text-slate-600 shrink-0">{r.region}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
