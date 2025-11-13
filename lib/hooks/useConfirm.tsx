'use client';

import React, { useState, useCallback } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface UseConfirmReturn {
  ConfirmationDialog: () => React.ReactElement;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  isConfirming: boolean;
}

/**
 * useConfirm Hook
 *
 * Provides a promise-based confirmation dialog to replace window.confirm()
 *
 * @returns {UseConfirmReturn} Object containing ConfirmationDialog component and confirm function
 *
 * @example
 * ```tsx
 * const { ConfirmationDialog, confirm } = useConfirm();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Delete Item',
 *     message: 'Are you sure you want to delete this item?',
 *     confirmText: 'Delete',
 *     variant: 'danger'
 *   });
 *
 *   if (confirmed) {
 *     // Perform deletion
 *   }
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleDelete}>Delete</button>
 *     <ConfirmationDialog />
 *   </>
 * );
 * ```
 */
export default function useConfirm(): UseConfirmReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: 'Confirm Action',
    message: 'Are you sure?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'warning'
  });
  const [resolveRef, setResolveRef] = useState<{
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions({
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      variant: 'warning',
      ...opts
    });
    setIsOpen(true);
    setIsLoading(false);

    return new Promise((resolve) => {
      setResolveRef({ resolve });
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    setIsLoading(true);
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 100));
    setIsLoading(false);
    setIsOpen(false);
    if (resolveRef) {
      resolveRef.resolve(true);
    }
    setResolveRef(null);
  }, [resolveRef]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
    if (resolveRef) {
      resolveRef.resolve(false);
    }
    setResolveRef(null);
  }, [resolveRef]);

  const ConfirmationDialog = useCallback(() => {
    return (
      <ConfirmDialog
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        variant={options.variant}
        loading={isLoading}
      />
    );
  }, [isOpen, handleCancel, handleConfirm, options, isLoading]);

  return {
    ConfirmationDialog,
    confirm,
    isConfirming: isLoading
  };
}
