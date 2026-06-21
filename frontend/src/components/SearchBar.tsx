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

  // Debounced search — fires 400 ms after the user stops typing
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

  // Close dropdown on outside click
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
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search ticker or company…"
          className="w-full pl-4 pr-9 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
          aria-label="Search stocks"
          aria-autocomplete="list"
          aria-expanded={isOpen}
        />
        {isFetching && (
          <span className="absolute right-3 top-2.5 pointer-events-none">
            <span className="block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </span>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          {results.map((r, i) => (
            <li key={r.symbol} role="option" aria-selected={i === activeIndex}>
              <button
                onMouseDown={(e) => {
                  // prevent input blur before click fires
                  e.preventDefault();
                  navigateTo(r.symbol);
                }}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                  i === activeIndex ? "bg-blue-50" : ""
                }`}
              >
                <span className="font-semibold text-gray-900 w-16 shrink-0 text-sm">
                  {r.symbol}
                </span>
                <span className="text-gray-500 text-sm truncate flex-1">{r.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{r.region}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
