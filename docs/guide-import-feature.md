# Mentoring Guide - Multi-Format Import Feature

## Overview

A comprehensive file management system for the Mentoring Guide page that allows authorized users to import, manage, preview, and organize guide documents in multiple formats.

## Features

### 1. **Multi-Format Support**
Supports the following file types:
- **PDF** (.pdf) - Portable Document Format
- **Word** (.docx) - Microsoft Word documents
- **Excel** (.xlsx) - Microsoft Excel spreadsheets
- **CSV** (.csv) - Comma-separated values
- **PowerPoint** (.pptx) - Microsoft PowerPoint presentations
- **Text** (.txt) - Plain text files
- **Markdown** (.md) - Markdown documents
- **Images** (.png, .jpg, .jpeg) - Image files

**File Size Limit:** 50MB per file

### 2. **Role-Based Access Control**

#### Upload/Edit/Delete Permissions:
- ✅ Super Admin (`super_admin`)
- ✅ Administrator (`administrator`)
- ✅ Mentor Incharge (`mentor_incharge`)
- ❌ Mentor (read-only)
- ❌ Other roles (read-only)

#### View/Download Permissions:
- ✅ All authenticated users

### 3. **CRUD Operations**

#### Create (Upload)
- Drag-and-drop file upload interface
- Multiple file selection
- Real-time file validation
- Progress indicators
- Automatic categorization

#### Read (View/Preview)
- File preview for supported formats:
  - PDF: Embedded iframe viewer
  - Images: Full-screen image display
  - Text/Markdown/CSV: Syntax-highlighted text viewer
  - Office docs: Microsoft Office Online Viewer integration
- Downloadable for all file types
- Search and filter capabilities

#### Update (Edit)
- Edit document title
- Update description
- Change category
- File metadata display

#### Delete
- Confirmation dialog
- Cascade delete from storage and database
- Role-based permission check

## Components

### 1. **FileUploadDialog**
`components/guide/FileUploadDialog.tsx`

**Features:**
- Modal-based upload interface
- Drag-and-drop support
- File type validation
- File size validation (50MB max)
- Multiple file upload
- Upload progress tracking
- Error handling with user feedback
- Success/error status indicators

**Usage:**
```tsx
<FileUploadDialog
  isOpen={isUploadOpen}
  onClose={() => setIsUploadOpen(false)}
  onUploadSuccess={handleUploadSuccess}
/>
```

### 2. **FileManagementTable**
`components/guide/FileManagementTable.tsx`

**Features:**
- Responsive table/card layout
- Desktop: Full table view with sortable columns
- Mobile: Card-based view with touch-friendly actions
- File type icons with color coding
- Category badges
- File size formatting
- Action buttons (Preview, Download, Edit, Delete)
- Role-based action visibility

**Usage:**
```tsx
<FileManagementTable
  documents={filteredDocuments}
  canManage={canManage}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onPreview={handlePreview}
/>
```

### 3. **FilePreviewModal**
`components/guide/FilePreviewModal.tsx`

**Features:**
- Full-screen modal preview
- Format-specific renderers:
  - PDF: Embedded viewer
  - Images: Full-size display
  - Text files: Syntax-highlighted viewer
  - Office docs: Microsoft Office Online integration
- Download button
- Open in new tab option
- Loading states
- Error handling with fallback

**Usage:**
```tsx
<FilePreviewModal
  document={previewDocument}
  isOpen={isPreviewOpen}
  onClose={handleClosePreview}
/>
```

### 4. **EditDocumentDialog**
`components/guide/EditDocumentDialog.tsx`

**Features:**
- Modal-based edit form
- Title editing (required)
- Description editing (optional)
- Category editing
- File metadata display (read-only)
- Form validation
- Loading states
- Error handling

**Usage:**
```tsx
<EditDocumentDialog
  document={editDocument}
  isOpen={isEditOpen}
  onClose={handleCloseEdit}
  onSave={handleSaveEdit}
/>
```

## API Routes

### 1. **Upload Document**
`POST /api/guide/documents/upload`

**Authorization:** Super Admin, Administrator, Mentor Incharge

**Request:** `multipart/form-data`
- `file` (File) - The document file
- `title` (string, optional) - Document title
- `description` (string, optional) - Document description
- `category` (string, optional) - Document category

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "title": "Document Title",
    "description": "Description",
    "category": "Guide Documents",
    "file_url": "https://...",
    "file_type": "pdf",
    "file_size": 1024000,
    "upload_date": "2025-01-18T...",
    "uploaded_by": "user_id"
  }
}
```

### 2. **Update Document**
`PUT /api/guide/documents/{id}`

**Authorization:** Super Admin, Administrator, Mentor Incharge

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated Description",
  "category": "Updated Category"
}
```

**Response:**
```json
{
  "success": true,
  "document": { ... }
}
```

### 3. **Delete Document**
`DELETE /api/guide/documents/{id}`

**Authorization:** Super Admin, Administrator, Mentor Incharge

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

## Database Schema

### Table: `mentor_documents`

```sql
CREATE TABLE mentor_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Supabase Storage

### Bucket: `documents`

**Configuration:**
- Public bucket (read access for all authenticated users)
- File size limit: 50MB
- Allowed MIME types: PDF, DOCX, XLSX, PPTX, CSV, TXT, MD, PNG, JPG

**Storage Policies:**

1. **Read Access:** All authenticated users
2. **Upload Access:** Super Admin, Administrator, Mentor Incharge
3. **Update Access:** Super Admin, Administrator, Mentor Incharge
4. **Delete Access:** Super Admin, Administrator, Mentor Incharge

**File Path Structure:**
```
documents/
  └── guide-documents/
      └── {timestamp}-{random}.{extension}
```

## UI/UX Design

### Color Scheme
- **Primary Brand Green** (#0b6d41) - Headers, buttons, icons
- **Brand Yellow** (#ffde59) - Accent, hover states, badges
- **Brand Cream** (#fbfbee) - Backgrounds
- **Neutral Grays** - Text, borders, secondary elements

### Responsive Design
- **Mobile (< 768px):** Card-based layout with stacked actions
- **Tablet (768px - 1024px):** 2-column grid
- **Desktop (> 1024px):** Full table view with all columns

### Accessibility
- WCAG AA contrast ratios (minimum 4.5:1)
- Keyboard navigation support
- ARIA labels on all interactive elements
- Screen reader friendly
- Focus indicators on all interactive elements

## Usage Example

```tsx
// User with super_admin role
1. Navigate to /guide page
2. Click "Import Documents" button
3. Drag and drop files or click "Browse Files"
4. Select multiple files (PDF, DOCX, etc.)
5. Files are validated and listed
6. Click "Upload X File(s)"
7. Files upload with progress indicators
8. Success notification shown
9. Documents appear in the table

// Viewing documents (all roles)
1. Browse documents in the table
2. Use search bar to find specific documents
3. Filter by category
4. Click "Preview" to view document
5. Click "Download" to save locally

// Editing documents (authorized roles only)
1. Click "Edit" button on a document
2. Update title, description, or category
3. Click "Save Changes"
4. Document updates in real-time

// Deleting documents (authorized roles only)
1. Click "Delete" button on a document
2. Confirm deletion in dialog
3. Document removed from storage and database
```

## Security Features

1. **Server-side validation**
   - File type validation
   - File size limits
   - Role-based authorization
   - Input sanitization

2. **Storage security**
   - RLS policies on storage bucket
   - Authenticated access only
   - Role-based upload/delete permissions

3. **Database security**
   - Row-level security (if implemented)
   - Foreign key constraints
   - Audit trail with uploaded_by field

## Performance Optimizations

1. **Lazy loading**
   - Components loaded on demand
   - Preview content loaded only when opened

2. **File optimization**
   - 50MB file size limit
   - Efficient storage structure

3. **UI optimization**
   - Responsive images
   - Optimized re-renders
   - Debounced search

## Future Enhancements

1. **Bulk operations**
   - Select multiple documents
   - Bulk delete
   - Bulk category update

2. **Advanced search**
   - Full-text search
   - Filter by date range
   - Filter by file type

3. **Version control**
   - File version history
   - Restore previous versions

4. **Enhanced preview**
   - OCR for scanned PDFs
   - Better office document rendering
   - Video/audio file support

5. **Analytics**
   - Download counts
   - Most viewed documents
   - User engagement metrics

## Troubleshooting

### Issue: Upload fails with "File type not supported"
**Solution:** Ensure the file MIME type is in the allowed list. Some files may have incorrect MIME types.

### Issue: Preview shows "Preview not available"
**Solution:** Some file types cannot be previewed in-browser. Use the download button instead.

### Issue: Large files fail to upload
**Solution:** Files must be under 50MB. Compress large files or split into smaller documents.

### Issue: "Unauthorized" error when uploading
**Solution:** Only Super Admin, Administrator, and Mentor Incharge can upload. Check your role.

### Issue: Documents not showing after upload
**Solution:** Refresh the page or check the API response for errors in the browser console.

## Support

For issues or feature requests, contact the development team or create an issue in the project repository.

---

**Last Updated:** January 18, 2025
**Version:** 1.0.0
