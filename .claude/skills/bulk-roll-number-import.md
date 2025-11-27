# Bulk Roll Number Import Skill

## Overview
This skill provides a standardized workflow for bulk importing/mapping entities using Roll Numbers (Student IDs) from MyJKKN. It enables mentors and administrators to quickly assign multiple students to a mentor by pasting roll numbers or uploading a CSV/Excel file, instead of searching and adding students one-by-one.

## When to Use This Skill
- When implementing bulk student assignment to mentors
- When building any feature that requires mapping multiple students via Roll Numbers
- When creating bulk import functionality for JKKN applications
- When the user mentions "bulk import", "bulk upload", "paste roll numbers", "upload student list"

## Architecture Context

### Current Single-Add Flow (Manual)
```
Mentor Directory → Mentor Profile → Students Tab → Add Learner Modal
    ↓
Search by name/roll/email (min 2 chars, 500ms debounce)
    ↓
Select students one-by-one from search results
    ↓
Click "Assign Learner(s)" → POST /api/mentor/{id}/students for each
```

### New Bulk Import Flow
```
Mentor Directory → Mentor Profile → Students Tab → Bulk Import Modal
    ↓
Option A: Paste Roll Numbers (comma/newline/space separated)
Option B: Upload CSV/Excel with Roll Number column
    ↓
System validates each roll number against JKKN API
    ↓
Preview Table:
  ✓ Valid & Available (green) - ready to assign
  ⚠ Already Assigned (yellow) - skip or reassign
  ✗ Invalid/Not Found (red) - remove from list
    ↓
Confirm → Bulk POST to /api/mentor/{id}/students/bulk
    ↓
Success summary with counts
```

## Database Schema Reference

### Key Tables
```sql
-- Students table (stores student data from MyJKKN)
CREATE TABLE public.students (
  id UUID PRIMARY KEY,
  roll_number TEXT UNIQUE NOT NULL,  -- This is the key field for bulk import
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  year TEXT,
  section TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Mentor-Student mapping (junction table)
CREATE TABLE public.mentor_students (
  id UUID PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  assigned_by UUID REFERENCES public.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(mentor_id, student_id)  -- Prevents duplicate assignments
);
```

## Implementation Guide

### Step 1: Create Bulk Validation API Endpoint

**Path:** `app/api/students/validate-bulk/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess } from '@/lib/middleware/access-control';

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
  currentMentor?: string; // If already assigned
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const userAccess = await getUserAccess();
    if (!userAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rollNumbers, mentorId } = await request.json();

    if (!Array.isArray(rollNumbers) || rollNumbers.length === 0) {
      return NextResponse.json({ error: 'Roll numbers array required' }, { status: 400 });
    }

    // Limit bulk validation (prevent abuse)
    const MAX_BULK_SIZE = 500;
    if (rollNumbers.length > MAX_BULK_SIZE) {
      return NextResponse.json({
        error: `Maximum ${MAX_BULK_SIZE} roll numbers allowed per batch`
      }, { status: 400 });
    }

    const results: ValidationResult[] = [];

    // Fetch all students from JKKN API (cached if possible)
    const allStudents = await fetchAllStudentsFromJKKN();

    // Get already assigned students for this mentor
    const assignedStudents = await getAssignedStudents(mentorId);
    const assignedRollNumbers = new Set(assignedStudents.map(s => s.roll_number.toLowerCase()));

    for (const rollNumber of rollNumbers) {
      const normalizedRoll = rollNumber.trim().toUpperCase();

      // Validate format (customize regex based on actual roll number format)
      if (!isValidRollNumberFormat(normalizedRoll)) {
        results.push({
          rollNumber: normalizedRoll,
          status: 'invalid_format',
          message: 'Invalid roll number format'
        });
        continue;
      }

      // Check if already assigned to this mentor
      if (assignedRollNumbers.has(normalizedRoll.toLowerCase())) {
        results.push({
          rollNumber: normalizedRoll,
          status: 'already_assigned',
          message: 'Already assigned to this mentor'
        });
        continue;
      }

      // Find student in JKKN data
      const student = allStudents.find(s =>
        (s.roll_number || s.rollNumber || '').toUpperCase() === normalizedRoll
      );

      if (!student) {
        results.push({
          rollNumber: normalizedRoll,
          status: 'not_found',
          message: 'Student not found in MyJKKN'
        });
        continue;
      }

      // Institution filtering for non-admin users
      if (!userAccess.isSuperAdmin && userAccess.institutionId) {
        const studentInstitution = student.institution?.id || student.institution_id;
        if (studentInstitution !== userAccess.institutionId) {
          results.push({
            rollNumber: normalizedRoll,
            status: 'not_found',
            message: 'Student not in your institution'
          });
          continue;
        }
      }

      // Valid student found
      results.push({
        rollNumber: normalizedRoll,
        status: 'valid',
        student: {
          id: student.id,
          name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
          email: student.email || '',
          department: extractDepartmentName(student.department),
          year: student.year || student.current_year || '',
          institution: extractInstitutionName(student.institution)
        }
      });
    }

    // Summary counts
    const summary = {
      total: results.length,
      valid: results.filter(r => r.status === 'valid').length,
      alreadyAssigned: results.filter(r => r.status === 'already_assigned').length,
      notFound: results.filter(r => r.status === 'not_found').length,
      invalidFormat: results.filter(r => r.status === 'invalid_format').length
    };

    return NextResponse.json({
      success: true,
      results,
      summary
    });

  } catch (error) {
    console.error('[Bulk Validation] Error:', error);
    return NextResponse.json({
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper: Validate roll number format
function isValidRollNumberFormat(rollNumber: string): boolean {
  // Customize based on actual JKKN roll number patterns
  // Example: 21BDS001, 22MDS015, etc.
  if (!rollNumber || rollNumber.length < 3) return false;
  // Basic check - alphanumeric
  return /^[A-Z0-9]+$/i.test(rollNumber);
}

// Helper: Extract department name from nested object
function extractDepartmentName(dept: any): string {
  if (typeof dept === 'object' && dept !== null) {
    return dept.name || dept.department_name || 'Unknown';
  }
  return String(dept || 'Unknown');
}

// Helper: Extract institution name from nested object
function extractInstitutionName(inst: any): string {
  if (typeof inst === 'object' && inst !== null) {
    return inst.name || inst.institution_name || 'Unknown';
  }
  return String(inst || 'Unknown');
}
```

### Step 2: Create Bulk Assignment API Endpoint

**Path:** `app/api/mentor/[id]/students/bulk/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess, canAssignStudents } from '@/lib/middleware/access-control';
import { createClient } from '@/lib/supabase/server';

interface BulkAssignmentRequest {
  students: Array<{
    id: string;
    name: string;
    email: string;
    rollNumber: string;
    department: string;
    year: string;
    institution?: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userAccess = await getUserAccess();
    if (!userAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mentorJkknId = params.id;
    const { students }: BulkAssignmentRequest = await request.json();

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'Students array required' }, { status: 400 });
    }

    // Limit bulk assignment
    const MAX_BULK_SIZE = 100;
    if (students.length > MAX_BULK_SIZE) {
      return NextResponse.json({
        error: `Maximum ${MAX_BULK_SIZE} students allowed per bulk assignment`
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Get mentor record
    const { data: mentor, error: mentorError } = await supabase
      .from('mentors')
      .select('id, institution_id, user_id')
      .eq('user_id', (
        await supabase
          .from('users')
          .select('id')
          .eq('jkkn_user_id', mentorJkknId)
          .single()
      ).data?.id)
      .single();

    if (mentorError || !mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Check authorization
    const canAssign = await canAssignStudents(userAccess, mentor.id, mentor.institution_id);
    if (!canAssign) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get assigning user's ID
    const { data: assigningUser } = await supabase
      .from('users')
      .select('id')
      .eq('jkkn_user_id', userAccess.userId)
      .single();

    const results = {
      success: [] as string[],
      alreadyAssigned: [] as string[],
      failed: [] as { rollNumber: string; error: string }[]
    };

    // Process each student
    for (const student of students) {
      try {
        // Upsert student record
        const { data: studentRecord, error: upsertError } = await supabase
          .from('students')
          .upsert({
            id: student.id,
            roll_number: student.rollNumber,
            name: student.name,
            email: student.email,
            department_id: student.department,
            institution_id: student.institution || mentor.institution_id,
            year: student.year,
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'roll_number'
          })
          .select('id')
          .single();

        if (upsertError) {
          results.failed.push({
            rollNumber: student.rollNumber,
            error: 'Failed to create student record'
          });
          continue;
        }

        // Create mentor-student mapping
        const { error: mappingError } = await supabase
          .from('mentor_students')
          .upsert({
            mentor_id: mentor.id,
            student_id: studentRecord.id,
            assigned_by: assigningUser?.id,
            assigned_at: new Date().toISOString()
          }, {
            onConflict: 'mentor_id,student_id',
            ignoreDuplicates: true
          });

        if (mappingError) {
          if (mappingError.code === '23505') { // Unique violation
            results.alreadyAssigned.push(student.rollNumber);
          } else {
            results.failed.push({
              rollNumber: student.rollNumber,
              error: mappingError.message
            });
          }
        } else {
          results.success.push(student.rollNumber);
        }

      } catch (err) {
        results.failed.push({
          rollNumber: student.rollNumber,
          error: 'Unexpected error'
        });
      }
    }

    // Update mentor's total_students count
    if (results.success.length > 0) {
      const { count } = await supabase
        .from('mentor_students')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', mentor.id);

      await supabase
        .from('mentors')
        .update({ total_students: count || 0 })
        .eq('id', mentor.id);
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: students.length,
        assigned: results.success.length,
        alreadyAssigned: results.alreadyAssigned.length,
        failed: results.failed.length
      }
    });

  } catch (error) {
    console.error('[Bulk Assignment] Error:', error);
    return NextResponse.json({
      error: 'Bulk assignment failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### Step 3: Create BulkImportModal Component

**Path:** `app/(dashboard)/mentor/[id]/components/BulkImportModal.tsx`

```typescript
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

  // Handle file upload (CSV/Excel)
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
              !rollNumber.toLowerCase().includes('id')) {
            rollNumbers.push(rollNumber);
          }
        }
      }

      setInputText(rollNumbers.join('\n'));
    };
    reader.readAsText(file);
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
        return <Badge variant="danger">Not Found</Badge>;
      case 'invalid_format':
        return <Badge variant="danger">Invalid Format</Badge>;
    }
  };

  // Count stats
  const validCount = validationResults.filter(r => r.status === 'valid').length;
  const selectedCount = selectedResults.size;

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
            Or upload a CSV file with roll numbers in the first column.
          </p>

          {/* Textarea for roll numbers */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Roll Numbers
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter roll numbers here...&#10;Example:&#10;21BDS001&#10;21BDS002, 21BDS003&#10;22MDS001"
              rows={8}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-sm font-mono"
            />
            <p className="text-xs text-neutral-500 mt-1">
              {parseRollNumbers(inputText).length} roll number(s) detected
            </p>
          </div>

          {/* File upload */}
          <div className="border-t border-neutral-200 pt-4">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Or upload CSV file
            </label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="block w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-green/10 file:text-brand-green hover:file:bg-brand-green/20"
            />
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleValidate}
              disabled={validating || parseRollNumbers(inputText).length === 0}
            >
              {validating ? 'Validating...' : 'Validate Roll Numbers'}
            </Button>
          </ModalFooter>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4 p-3 bg-neutral-50 rounded-lg">
            <div className="text-sm">
              <span className="text-green-600 font-medium">{validCount} valid</span>
              <span className="text-neutral-400 mx-2">|</span>
              <span className="text-yellow-600 font-medium">
                {validationResults.filter(r => r.status === 'already_assigned').length} already assigned
              </span>
              <span className="text-neutral-400 mx-2">|</span>
              <span className="text-red-600 font-medium">
                {validationResults.filter(r => r.status === 'not_found' || r.status === 'invalid_format').length} invalid
              </span>
            </div>
            {validCount > 0 && (
              <button
                onClick={toggleSelectAll}
                className="ml-auto text-sm text-brand-green hover:underline"
              >
                {selectedCount === validCount ? 'Deselect All' : 'Select All Valid'}
              </button>
            )}
          </div>

          {/* Results list */}
          <div className="max-h-80 overflow-y-auto border border-neutral-200 rounded-lg divide-y">
            {validationResults.map((result) => (
              <div
                key={result.rollNumber}
                className={`flex items-center gap-3 p-3 ${
                  result.status === 'valid' ? 'hover:bg-green-50 cursor-pointer' : 'bg-neutral-50'
                }`}
                onClick={() => result.status === 'valid' && toggleSelection(result.rollNumber)}
              >
                {/* Checkbox (only for valid) */}
                {result.status === 'valid' && (
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
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
                )}

                {/* Roll Number */}
                <span className="font-mono text-sm font-medium w-24">
                  {result.rollNumber}
                </span>

                {/* Status Badge */}
                {getStatusBadge(result.status)}

                {/* Student Info (if valid) */}
                {result.student && (
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{result.student.name}</span>
                    <span className="text-neutral-500 ml-2">
                      {result.student.department} • Year {result.student.year}
                    </span>
                  </div>
                )}

                {/* Error message */}
                {result.message && result.status !== 'valid' && (
                  <span className="text-sm text-neutral-500">{result.message}</span>
                )}
              </div>
            ))}
          </div>

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
          <p className="text-neutral-600">Assigning learners to mentor...</p>
          <p className="text-sm text-neutral-500 mt-1">Please wait</p>
        </div>
      )}
    </Modal>
  );
}
```

### Step 4: Integrate into StudentsTab

**File:** `app/(dashboard)/mentor/[id]/components/StudentsTab.tsx`

Add the bulk import button and modal:

```typescript
// Add import at top
import BulkImportModal from './BulkImportModal';

// Add state for bulk import modal
const [showBulkImportModal, setShowBulkImportModal] = useState(false);

// In the header section, add bulk import button next to "Add Learner":
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
  <h2 className="text-[17px] font-medium text-neutral-900">
    Assigned Learners ({assignedStudents.length})
  </h2>
  <div className="flex gap-2">
    {/* Bulk Import Button */}
    <button
      onClick={() => setShowBulkImportModal(true)}
      className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-neutral-50 text-brand-green font-medium rounded-lg transition-all flex items-center justify-center gap-2 text-[14px] border border-brand-green"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      <span>Bulk Import</span>
    </button>

    {/* Existing Add Learner Button */}
    <button
      onClick={() => setShowAddModal(true)}
      className="w-full sm:w-auto px-4 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 text-[14px]"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <span>Add Learner</span>
    </button>
  </div>
</div>

// Add the modal component at the end (before closing </div>):
<BulkImportModal
  isOpen={showBulkImportModal}
  onClose={() => setShowBulkImportModal(false)}
  mentorId={mentorId}
  onSuccess={fetchStudents}
/>
```

## UI/UX Best Practices

### Input Step
- Clear placeholder text with examples
- Real-time count of detected roll numbers
- Support multiple input formats (comma, space, newline)
- File upload as alternative option
- Validate button disabled until input provided

### Preview Step
- Color-coded status badges (green=valid, yellow=already assigned, red=invalid)
- Checkbox selection for valid students only
- Select/Deselect All functionality
- Summary stats at top
- Scrollable list for large batches
- Show student details (name, department, year) for valid entries

### Importing Step
- Loading spinner with status message
- Disable close/cancel during import
- Handle partial failures gracefully

### Success/Error Handling
- Toast notifications for each step
- Clear summary of results (X assigned, Y already assigned, Z failed)
- Preserve state on error for retry

## Validation Rules

1. **Format Validation**
   - Roll number must be alphanumeric
   - Minimum length: 3 characters
   - Customize regex based on actual JKKN format

2. **Existence Check**
   - Must exist in MyJKKN student database
   - Institution filtering for non-admin users

3. **Duplicate Prevention**
   - Already assigned to this mentor → Skip with warning
   - Duplicate in input → Remove duplicates automatically

4. **Limits**
   - Maximum 500 roll numbers per validation batch
   - Maximum 100 students per assignment batch

## Error Messages

| Status | Message |
|--------|---------|
| `valid` | Ready to assign |
| `already_assigned` | Already assigned to this mentor |
| `not_found` | Student not found in MyJKKN |
| `invalid_format` | Invalid roll number format |

## Testing Checklist

- [ ] Paste roll numbers with different separators (comma, space, newline)
- [ ] Upload CSV file with roll numbers
- [ ] Validate with mix of valid/invalid roll numbers
- [ ] Select/deselect students in preview
- [ ] Bulk assign selected students
- [ ] Verify already-assigned students are skipped
- [ ] Test with maximum batch size (500 validation, 100 assignment)
- [ ] Test institution filtering for non-admin users
- [ ] Verify toast messages and error handling
- [ ] Check assigned students list updates after import

## Related Files

- `app/(dashboard)/mentor/[id]/components/StudentsTab.tsx` - Main students tab
- `app/api/students/search/route.ts` - Existing search API (reference)
- `app/api/mentor/[id]/students/route.ts` - Existing single assignment API
- `lib/middleware/access-control.ts` - Authorization helpers
- `lib/types/mentor.ts` - TypeScript types for Student, Mentor
