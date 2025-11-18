import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/server';

const ALLOWED_ROLES = ['super_admin', 'administrator', 'mentor_incharge'];

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication and role
    const user = await getCurrentUser();
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Only Super Admin, Administrator, or Mentor Incharge can delete documents.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Get document details using admin client
    const supabase = createAdminClient();
    const { data: document, error: fetchError } = await supabase
      .from('mentor_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Extract file path from URL
    const fileUrl = document.file_url;
    const filePath = fileUrl?.split('/documents/').pop();

    // Delete from storage if file path exists
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([`guide-documents/${filePath}`]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('mentor_documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify authentication and role
    const user = await getCurrentUser();
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Only Super Admin, Administrator, or Mentor Incharge can update documents.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, category } = body;

    // Validate input
    if (!title || title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Update document using admin client
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('mentor_documents')
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      document: data,
    });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
