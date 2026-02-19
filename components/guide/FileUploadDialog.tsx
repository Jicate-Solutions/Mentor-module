'use client';

import { useState, useCallback, useRef } from 'react';
import { X, Upload, File, FileText, FileSpreadsheet, FileVideo, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';

interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const ACCEPTED_FORMATS = {
  'application/pdf': { ext: '.pdf', icon: FileText, color: 'text-red-500' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', icon: FileText, color: 'text-blue-500' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: '.xlsx', icon: FileSpreadsheet, color: 'text-green-500' },
  'text/csv': { ext: '.csv', icon: FileSpreadsheet, color: 'text-green-500' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: '.pptx', icon: FileVideo, color: 'text-orange-500' },
  'text/plain': { ext: '.txt', icon: FileText, color: 'text-neutral-500' },
  'text/markdown': { ext: '.md', icon: FileText, color: 'text-purple-500' },
  'image/png': { ext: '.png', icon: ImageIcon, color: 'text-pink-500' },
  'image/jpeg': { ext: '.jpg', icon: ImageIcon, color: 'text-pink-500' },
  'image/jpg': { ext: '.jpg', icon: ImageIcon, color: 'text-pink-500' },
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function FileUploadDialog({ isOpen, onClose, onUploadSuccess }: FileUploadDialogProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    const format = ACCEPTED_FORMATS[type as keyof typeof ACCEPTED_FORMATS];
    return format ? format.icon : File;
  };

  const getFileColor = (type: string) => {
    const format = ACCEPTED_FORMATS[type as keyof typeof ACCEPTED_FORMATS];
    return format ? format.color : 'text-neutral-500';
  };

  const validateFile = (file: File): string | null => {
    if (!Object.keys(ACCEPTED_FORMATS).includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 50MB limit`;
    }
    return null;
  };

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;

    const fileArray = Array.from(newFiles);
    const uploadFiles: UploadFile[] = fileArray.map((file) => {
      const error = validateFile(file);
      return {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: error ? 'error' : 'pending',
        progress: 0,
        error,
      } as UploadFile;
    });

    setFiles((prev) => [...prev, ...uploadFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    const formData = new FormData();
    formData.append('file', uploadFile.file);
    formData.append('category', 'Guide Documents');
    formData.append('title', uploadFile.file.name.replace(/\.[^/.]+$/, ''));

    try {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
        )
      );

      const response = await fetch('/api/guide/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f
        )
      );
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', error: 'Upload failed' }
            : f
        )
      );
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    for (const file of pendingFiles) {
      await uploadFile(file);
    }

    // Check if all files uploaded successfully
    const allSuccess = files.every((f) => f.status === 'success');
    if (allSuccess) {
      setTimeout(() => {
        onUploadSuccess();
        handleClose();
      }, 1000);
    }
  };

  const handleClose = () => {
    setFiles([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div>
            <h2 className="text-2xl font-medium text-brand-green">Import Guide Documents</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Upload PDF, DOCX, XLSX, PPTX, CSV, TXT, MD, or image files (Max 50MB each)
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Upload Area */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
              isDragging
                ? 'border-brand-green bg-brand-yellow/10'
                : 'border-neutral-300 hover:border-brand-green'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={Object.keys(ACCEPTED_FORMATS).join(',')}
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />

            <div className="w-16 h-16 bg-brand-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-brand-green" />
            </div>

            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              {isDragging ? 'Drop files here' : 'Drag and drop files here'}
            </h3>

            <p className="text-sm text-neutral-600 mb-4">or</p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-brand-green text-white font-medium rounded-lg hover:bg-primary-700 transition"
            >
              Browse Files
            </button>

            <p className="text-xs text-neutral-500 mt-4">
              Supported: PDF, DOCX, XLSX, PPTX, CSV, TXT, MD, PNG, JPG
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-medium text-neutral-700">
                Selected Files ({files.length})
              </h4>
              {files.map((uploadFile) => {
                const Icon = getFileIcon(uploadFile.file.type);
                const colorClass = getFileColor(uploadFile.file.type);

                return (
                  <div
                    key={uploadFile.id}
                    className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200"
                  >
                    <div className={`flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-8 h-8" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 truncate">
                        {uploadFile.file.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>

                      {uploadFile.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-green transition-all duration-300"
                              style={{ width: `${uploadFile.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {uploadFile.error && (
                        <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      {uploadFile.status === 'success' && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      {uploadFile.status === 'pending' && (
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          className="p-1.5 hover:bg-neutral-200 rounded transition"
                          aria-label="Remove file"
                        >
                          <X className="w-4 h-4 text-neutral-500" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-neutral-200">
          <button
            onClick={handleClose}
            className="px-6 py-3 border-2 border-neutral-300 text-neutral-700 font-medium rounded-lg hover:border-neutral-400 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleUploadAll}
            disabled={files.length === 0 || files.every((f) => f.status !== 'pending')}
            className="px-6 py-3 bg-brand-yellow text-brand-green font-medium rounded-lg hover:bg-accent-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload {files.filter((f) => f.status === 'pending').length} File(s)
          </button>
        </div>
      </div>
    </div>
  );
}
