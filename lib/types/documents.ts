export interface MentorDocument {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: 'pdf' | 'doc' | 'docx' | 'ppt' | 'pptx';
  file_size: number | null;
  thumbnail_url: string | null;
  category: string | null;
  order_index: number;
  is_published: boolean;
  upload_date: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentCategory {
  name: string;
  count: number;
}
