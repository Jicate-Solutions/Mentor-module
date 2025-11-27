'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface ValidationResult {
  rollNumber: string;
  status: 'valid' | 'already_assigned' | 'not_found' | 'invalid_format';
  student?: {
    id: string;
    name: string;
    email: string;
    department: string;
    year: string;
    institution: string;
  };
  message?: string;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorId: string;
  onSuccess: () => void;
}

type ImportStep = 'input' | 'preview' | 'importing';

export default function BulkImportModal({
  isOpen,
  onClose,
  mentorId,
  onSuccess
}: BulkImportModalProps) {
  const { accessToken } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<ImportStep>('input');
  const [inputText, setInputText] = useState('');
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());

  // Parse roll numbers from input
  const parseRollNumbers = (text: string): string[] => {
    // Support comma, newline, space, tab, semicolon separators
    const rollNumbers = text
      .split(/[\s,;\n\t]+/)
      .map(r => r.trim().toUpperCase())
      .filter(r => r.length > 0);

    // Remove duplicates
    return [...new Set(rollNumbers)];
  };

  // Handle file upload (CSV)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;

      // Parse CSV - assume first column is roll number
      const lines = content.split('\n');
      const rollNumbers: string[] = [];

      for (const line of lines) {
        const columns = line.split(',');
        if (columns[0]) {
          const rollNumber = columns[0].trim().replace(/['"]/g, '');
          // Skip header row if it looks like a header
          if (!rollNumber.toLowerCase().includes('roll') &&
              !rollNumber.toLowerCase().includes('number') &&
              !rollNumber.toLowerCase().includes('id') &&
              !rollNumber.toLowerCase().includes('student')) {
            rollNumbers.push(rollNumber);
          }
        }
      }

      setInputText(rollNumbers.join('\n'));
      toast.success('File loaded', `Found ${rollNumbers.length} roll numbers`);
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
  };

  // Validate roll numbers
  const handleValidate = async () => {
    const rollNumbers = parseRollNumbers(inputText);

    if (rollNumbers.length === 0) {
      toast.error('No roll numbers', 'Please enter at least one roll number');
      return;
    }

    if (rollNumbers.length > 500) {
      toast.error('Too many roll numbers', 'Maximum 500 roll numbers allowed per batch');
      return;
    }

    try {
      setValidating(true);

      const response = await fetch('/api/students/validate-bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rollNumbers, mentorId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Validation failed');
      }

      const data = await response.json();
      setValidationResults(data.results);

      // Pre-select all valid students
      const validRolls = data.results
        .filter((r: ValidationResult) => r.status === 'valid')
        .map((r: ValidationResult) => r.rollNumber);
      setSelectedResults(new Set(validRolls));

      setStep('preview');

      // Show summary toast
      toast.info(
        'Validation complete',
        `${data.summary.valid} valid, ${data.summary.alreadyAssigned} already assigned, ${data.summary.notFound + data.summary.invalidFormat} invalid`
      );

    } catch (error) {
      toast.error('Validation failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setValidating(false);
    }
  };

  // Toggle selection
  const toggleSelection = (rollNumber: string) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(rollNumber)) {
      newSelected.delete(rollNumber);
    } else {
      newSelected.add(rollNumber);
    }
    setSelectedResults(newSelected);
  };

  // Select/deselect all valid
  const toggleSelectAll = () => {
    const validRolls = validationResults
      .filter(r => r.status === 'valid')
      .map(r => r.rollNumber);

    const allSelected = validRolls.every(r => selectedResults.has(r));

    if (allSelected) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(validRolls));
    }
  };

  // Perform bulk assignment
  const handleImport = async () => {
    const studentsToAssign = validationResults
      .filter(r => r.status === 'valid' && selectedResults.has(r.rollNumber) && r.student)
      .map(r => ({
        id: r.student!.id,
        name: r.student!.name,
        email: r.student!.email,
        rollNumber: r.rollNumber,
        department: r.student!.department,
        year: r.student!.year,
        institution: r.student!.institution
      }));

    if (studentsToAssign.length === 0) {
      toast.error('No students selected', 'Please select at least one valid student');
      return;
    }

    try {
      setImporting(true);
      setStep('importing');

      const response = await fetch(`/api/mentor/${mentorId}/students/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ students: studentsToAssign }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }

      const data = await response.json();

      // Show success message
      if (data.summary.assigned > 0) {
        toast.success(
          'Import successful',
          `Assigned ${data.summary.assigned} learner${data.summary.assigned > 1 ? 's' : ''} to mentor`
        );
      }

      if (data.summary.failed > 0) {
        toast.warning(
          'Some assignments failed',
          `${data.summary.failed} learner${data.summary.failed > 1 ? 's' : ''} could not be assigned`
        );
      }

      // Reset and close
      handleReset();
      onSuccess();
      onClose();

    } catch (error) {
      toast.error('Import failed', error instanceof Error ? error.message : 'Unknown error');
      setStep('preview'); // Go back to preview on error
    } finally {
      setImporting(false);
    }
  };

  // Reset modal state
  const handleReset = () => {
    setStep('input');
    setInputText('');
    setValidationResults([]);
    setSelectedResults(new Set());
  };

  // Close handler
  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Get status badge
  const getStatusBadge = (status: ValidationResult['status']) => {
    switch (status) {
      case 'valid':
        return <Badge variant="success">Valid</Badge>;
      case 'already_assigned':
        return <Badge variant="warning">Already Assigned</Badge>;
      case 'not_found':
        return <Badge variant="error">Not Found</Badge>;
      case 'invalid_format':
        return <Badge variant="error">Invalid Format</Badge>;
    }
  };

  // Count stats
  const validCount = validationResults.filter(r => r.status === 'valid').length;
  const selectedCount = selectedResults.size;
  const detectedCount = parseRollNumbers(inputText).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === 'input' ? 'Bulk Import Learners' :
        step === 'preview' ? 'Preview & Confirm' :
        'Importing...'
      }
      size="lg"
    >
      {/* Step 1: Input */}
      {step === 'input' && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Enter roll numbers separated by commas, spaces, or new lines.
            You can also upload a CSV file with roll numbers in the first column.
          </p>

          {/* Textarea for roll numbers */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Roll Numbers
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Enter roll numbers here...\nExample:\n21BDS001\n21BDS002, 21BDS003\n22MDS001`}
              rows={8}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-sm font-mono resize-none"
            />
            <p className="text-xs text-neutral-500 mt-1">
              {detectedCount} roll number{detectedCount !== 1 ? 's' : ''} detected
            </p>
          </div>

          {/* File upload */}
          <div className="border-t border-neutral-200 pt-4">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Or upload CSV file
            </label>
            <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-brand-green hover:bg-brand-green/5 transition-colors">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Click to upload CSV file</span>
              </div>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <p className="text-xs text-neutral-500 mt-1">
              CSV should have roll numbers in the first column
            </p>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleValidate}
              disabled={validating || detectedCount === 0}
            >
              {validating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Validating...
                </span>
              ) : (
                `Validate ${detectedCount} Roll Number${detectedCount !== 1 ? 's' : ''}`
              )}
            </Button>
          </ModalFooter>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-neutral-50 rounded-lg">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                {validCount} valid
              </span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-medium">
                {validationResults.filter(r => r.status === 'already_assigned').length} already assigned
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-medium">
                {validationResults.filter(r => r.status === 'not_found' || r.status === 'invalid_format').length} invalid
              </span>
            </div>
            {validCount > 0 && (
              <button
                onClick={toggleSelectAll}
                className="ml-auto text-sm text-brand-green hover:underline font-medium"
              >
                {selectedCount === validCount ? 'Deselect All' : 'Select All Valid'}
              </button>
            )}
          </div>

          {/* Results list */}
          <div className="max-h-80 overflow-y-auto border border-neutral-200 rounded-lg divide-y divide-neutral-100">
            {validationResults.map((result) => (
              <div
                key={result.rollNumber}
                className={`flex items-center gap-3 p-3 ${
                  result.status === 'valid' ? 'hover:bg-green-50 cursor-pointer' : 'bg-neutral-50/50'
                }`}
                onClick={() => result.status === 'valid' && toggleSelection(result.rollNumber)}
              >
                {/* Checkbox (only for valid) */}
                {result.status === 'valid' ? (
                  <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedResults.has(result.rollNumber)
                      ? 'bg-brand-green border-brand-green'
                      : 'border-neutral-300 bg-white'
                  }`}>
                    {selectedResults.has(result.rollNumber) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-5 h-5" />
                )}

                {/* Roll Number */}
                <span className="font-mono text-sm font-medium w-28 flex-shrink-0">
                  {result.rollNumber}
                </span>

                {/* Status Badge */}
                <div className="flex-shrink-0">
                  {getStatusBadge(result.status)}
                </div>

                {/* Student Info (if valid) */}
                {result.student && (
                  <div className="flex-1 min-w-0 text-sm truncate">
                    <span className="font-medium text-neutral-900">{result.student.name}</span>
                    <span className="text-neutral-500 ml-2">
                      {result.student.department} • Year {result.student.year}
                    </span>
                  </div>
                )}

                {/* Error message */}
                {result.message && result.status !== 'valid' && (
                  <span className="flex-1 text-sm text-neutral-500 truncate">{result.message}</span>
                )}
              </div>
            ))}
          </div>

          {validCount === 0 && (
            <div className="text-center py-4 text-neutral-600">
              <p className="text-sm">No valid students found. Please check the roll numbers and try again.</p>
            </div>
          )}

          <ModalFooter>
            <Button variant="outline" onClick={() => setStep('input')}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={selectedCount === 0}
            >
              Assign {selectedCount} Learner{selectedCount !== 1 ? 's' : ''}
            </Button>
          </ModalFooter>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === 'importing' && (
        <div className="py-12 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-700 font-medium">Assigning learners to mentor...</p>
          <p className="text-sm text-neutral-500 mt-1">Please wait, this may take a moment</p>
        </div>
      )}
    </Modal>
  );
}
