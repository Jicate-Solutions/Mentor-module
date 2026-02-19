import React from 'react';
import Button from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  illustration?: 'default' | 'search' | 'folder' | 'document' | 'user' | 'error';
  className?: string;
}

/**
 * EmptyState Component
 *
 * Shows a helpful message when there's no content to display.
 * Includes optional illustrations, title, description, and action buttons.
 *
 * @param icon - Custom icon element
 * @param title - Main heading text
 * @param description - Descriptive text
 * @param action - Primary action button config
 * @param secondaryAction - Secondary action button config
 * @param illustration - Pre-built illustration type
 * @param className - Additional custom classes
 *
 * @example
 * ```tsx
 * <EmptyState
 *   illustration="search"
 *   title="No results found"
 *   description="Try adjusting your search or filter to find what you're looking for."
 *   action={{
 *     label: "Clear filters",
 *     onClick: () => handleClearFilters()
 *   }}
 * />
 * ```
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  illustration = 'default',
  className = ''
}: EmptyStateProps) {
  const illustrations = {
    default: (
      <svg className="w-24 h-24 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
    search: (
      <svg className="w-24 h-24 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    folder: (
      <svg className="w-24 h-24 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    document: (
      <svg className="w-24 h-24 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    user: (
      <svg className="w-24 h-24 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    error: (
      <svg className="w-24 h-24 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}>
      {/* Icon/Illustration */}
      <div className="mb-6">
        {icon || illustrations[illustration]}
      </div>

      {/* Content */}
      <div className="max-w-md">
        <h3 className="text-xl font-medium text-brand-green mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-neutral-600 mb-6">
            {description}
          </p>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {action && (
              <Button
                variant="primary"
                onClick={action.onClick}
                iconLeft={action.icon}
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant="outline"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * EmptyStateCard Component
 *
 * Empty state wrapped in a card container
 */
interface EmptyStateCardProps extends EmptyStateProps {
  padding?: 'sm' | 'md' | 'lg';
}

export function EmptyStateCard({
  padding = 'lg',
  ...props
}: EmptyStateCardProps) {
  const paddings = {
    sm: 'p-6',
    md: 'p-8',
    lg: 'p-12'
  };

  return (
    <div className={`bg-white rounded-xl border-2 border-dashed border-neutral-300 ${paddings[padding]}`}>
      <EmptyState {...props} className="py-0" />
    </div>
  );
}

/**
 * ErrorState Component
 *
 * Specialized empty state for error scenarios
 */
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading this content. Please try again.',
  onRetry,
  onGoBack,
  className = ''
}: ErrorStateProps) {
  return (
    <EmptyState
      illustration="error"
      title={title}
      description={message}
      action={onRetry ? {
        label: 'Try Again',
        onClick: onRetry,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      } : undefined}
      secondaryAction={onGoBack ? {
        label: 'Go Back',
        onClick: onGoBack
      } : undefined}
      className={className}
    />
  );
}

/**
 * NoSearchResults Component
 *
 * Specialized empty state for search results
 */
interface NoSearchResultsProps {
  searchQuery?: string;
  onClearSearch?: () => void;
  className?: string;
}

export function NoSearchResults({
  searchQuery,
  onClearSearch,
  className = ''
}: NoSearchResultsProps) {
  return (
    <EmptyState
      illustration="search"
      title="No results found"
      description={
        searchQuery
          ? `We couldn't find any results for "${searchQuery}". Try adjusting your search terms.`
          : 'Try adjusting your search or filter criteria.'
      }
      action={onClearSearch ? {
        label: 'Clear Search',
        onClick: onClearSearch
      } : undefined}
      className={className}
    />
  );
}
