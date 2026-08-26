import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  X,
  Filter,
  Sparkles,
  BookMarked,
} from 'lucide-react';
import { searchBooks } from '../api/api';

const CATEGORIES = [
  'All',
  'CSE',
  'ECE',
  'IT',
  'AI-DS',
  'Mechanical',
  'Civil',
  'Physics',
  'Mathematics',
];

export default function BookSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce logic (300ms delay to prevent excessive API hits)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch books when debounced query, category, or stock toggle changes
  useEffect(() => {
    let isMounted = true;

    async function fetchBookResults() {
      setLoading(true);
      setError(null);

      try {
        let data;
        const params = {
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          inStock: inStockOnly ? 'true' : undefined,
          limit: 60,
        };

        if (debouncedQuery) {
          data = await searchBooks(debouncedQuery, params);
        } else {
          data = await searchBooks('', params);
        }

        if (isMounted) {
          setBooks(data.books || []);
          setTotalCount(data.count !== undefined ? data.count : (data.books ? data.books.length : 0));
        }
      } catch (err) {
        if (isMounted) {
          console.error('Search failed:', err);
          setError('Failed to retrieve book catalog. Please ensure the backend server is running.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchBookResults();

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, selectedCategory, inStockOnly]);

  const handleClear = () => {
    setSearchQuery('');
    setDebouncedQuery('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Hero Section */}
        <div className="text-center space-y-4 pt-4 pb-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Smart Library Intelligent Search
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Find Any Engineering Book <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Instantly</span>
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400">
            Relevance-ranked search by subject code (e.g. <code className="text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">CS23302</code>), partial titles, authors, or categories.
          </p>
        </div>

        {/* Main Search Controls */}
        <div className="bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-2xl shadow-indigo-950/20 space-y-5">

          {/* Search Input Bar */}
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5 text-indigo-400" />
            </div>
            <input
              id="book-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject code (CS23302), title ('eng physics'), author ('Tanenbaum')..."
              className="w-full pl-12 pr-12 py-3.5 sm:py-4 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500 transition shadow-inner"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition"
                title="Clear search"
              >
                <X className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded-full p-0.5" />
              </button>
            )}
          </div>

          {/* Search Controls Row: Category Dropdown & In-Stock Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="category-select" className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-400" /> Category:
                </label>
                <select
                  id="category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'All' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* In-Stock Toggle */}
              <label className="flex items-center gap-2 cursor-pointer bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-300">In-Stock Only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Results Metadata Bar */}
        <div className="flex items-center justify-between px-1 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-indigo-400" />
            <span>
              {loading ? (
                'Searching library catalog...'
              ) : (
                <>
                  Found <strong className="text-white font-semibold">{totalCount}</strong> books
                  {debouncedQuery && (
                    <> matching &ldquo;<span className="text-indigo-300 font-medium">{debouncedQuery}</span>&rdquo;</>
                  )}
                  {selectedCategory !== 'All' && (
                    <> in <span className="text-indigo-300 font-medium">{selectedCategory}</span></>
                  )}
                </>
              )}
            </span>
          </div>
          {debouncedQuery && !loading && (
            <span className="text-xs text-slate-400 hidden sm:inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sorted by weighted relevance score
            </span>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Error Loading Books</p>
              <p className="text-xs text-red-300/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4 animate-pulse"
              >
                <div className="flex justify-between items-start">
                  <div className="h-5 bg-slate-800 rounded w-24"></div>
                  <div className="h-5 bg-slate-800 rounded w-16"></div>
                </div>
                <div className="h-6 bg-slate-800 rounded w-3/4"></div>
                <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                <div className="pt-3 border-t border-slate-800/60 flex justify-between">
                  <div className="h-4 bg-slate-800 rounded w-20"></div>
                  <div className="h-4 bg-slate-800 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Grid */}
        {!loading && books.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {books.map((book) => {
              const isOutOfStock = book.availableQuantity === 0;
              const availabilityRatio = book.totalQuantity > 0 ? (book.availableQuantity / book.totalQuantity) * 100 : 0;

              return (
                <div
                  key={book.bookId || book._id}
                  className="group relative bg-slate-900/85 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 transition duration-200 flex flex-col justify-between shadow-lg shadow-black/40 hover:shadow-indigo-950/30"
                >
                  <div className="space-y-3">
                    {/* Top Badges: Subject Code & Category */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-950 border border-indigo-700/50 text-indigo-300 group-hover:border-indigo-500/60 transition">
                        {book.subjectCode}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {book.category}
                      </span>
                    </div>

                    {/* Book Title */}
                    <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-indigo-200 transition line-clamp-2 leading-snug">
                      {book.title}
                    </h3>

                    {/* Author */}
                    <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5">
                      <span className="text-slate-400">By</span>
                      <span className="text-slate-300 font-medium line-clamp-1">{book.author}</span>
                    </p>
                  </div>

                  {/* Card Footer: Stock & Location */}
                  <div className="pt-4 mt-4 border-t border-slate-800/80 space-y-3">

                    {/* Quantity & Stock Indicator */}
                    <div className="flex items-center justify-between text-xs">
                      {isOutOfStock ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/80 border border-red-800/70 text-red-300 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          <span>Not Available (0/{book.totalQuantity})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{book.availableQuantity} of {book.totalQuantity} Available</span>
                        </div>
                      )}

                      {/* Shelf Location */}
                      <div className="flex items-center gap-1 text-slate-300 font-mono text-xs bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Shelf {book.shelfLocation}</span>
                      </div>
                    </div>

                    {/* Stock Progress Meter */}
                    <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isOutOfStock
                          ? 'w-0'
                          : availabilityRatio <= 25
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                          }`}
                        style={{ width: `${availabilityRatio}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && books.length === 0 && !error && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
              <BookOpen className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white">No Books Found</h3>
            <p className="text-sm text-slate-400">
              We couldn&apos;t find any books matching &ldquo;<span className="text-slate-200">{debouncedQuery}</span>&rdquo;.
            </p>
            <div className="pt-2 text-xs text-slate-400 space-y-1">
              <p>Search tips:</p>
              <p>&bull; Try searching by Subject Code (e.g. <span className="text-indigo-400 font-mono">CS23302</span> or <span className="text-indigo-400 font-mono">EC22401</span>)</p>
              <p>&bull; Try partial terms like <span className="text-indigo-400">&ldquo;eng physics&rdquo;</span> or <span className="text-indigo-400">&ldquo;thermo&rdquo;</span></p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
            >
              Reset Filters &amp; View All Books
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
