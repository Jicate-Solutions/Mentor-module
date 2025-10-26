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
      {/* Search Icon */}
      <div className="absolute left-4 pointer-events-none text-neutral-400">
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
      </div>

      {/* Input Field */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="
          w-full pl-12 pr-4 py-3 rounded-lg border border-neutral-300
          focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green
          transition-colors
        "
        disabled={loading}
      />

      {/* Optional Search Button */}
      {onSearch && (
        <button
          onClick={handleSearchClick}
          disabled={loading}
          className="
            ml-2 px-6 py-3 bg-brand-green text-brand-cream font-semibold rounded-lg
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
