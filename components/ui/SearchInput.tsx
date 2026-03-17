'use client';

import React from 'react';

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  className?: string;
  loading?: boolean;
}

/**
 * SearchInput Component
 *
 * A search input field with icon and optional search button.
 * Follows the brand design system.
 *
 * @param placeholder - Placeholder text
 * @param value - Current search value
 * @param onChange - Change handler
 * @param onSearch - Optional search button click handler
 * @param className - Additional custom classes
 * @param loading - Loading state
 */
export default function SearchInput({
  placeholder = 'Search...',
  value,
  onChange,
  onSearch,
  className = '',
  loading = false
}: SearchInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch();
    }
  };

  const handleSearchClick = () => {
    if (onSearch) {
      onSearch();
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Search Icon or Loading Spinner */}
      <div className="absolute left-4 pointer-events-none text-neutral-400">
        {loading ? (
          <svg
            className="w-5 h-5 animate-spin text-brand-green"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        )}
      </div>

      {/* Input Field */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="
          w-full pl-12 pr-12 py-3 rounded-lg border border-neutral-300
          text-neutral-900 bg-white placeholder:text-neutral-400
          focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green
          transition-colors
        "
        autoComplete="off"
        spellCheck="false"
      />

      {/* Clear Button */}
      {value && !loading && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
          aria-label="Clear search"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {/* Optional Search Button */}
      {onSearch && (
        <button
          onClick={handleSearchClick}
          disabled={loading}
          className="
            ml-2 px-6 py-3 bg-brand-green text-brand-cream font-medium rounded-lg
            hover:bg-primary-700 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      )}
    </div>
  );
}
