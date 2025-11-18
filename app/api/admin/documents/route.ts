import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireMinimumLevel } from '@/lib/middleware/access-control';

/**
 * GET /api/admin/documents
 * Get all documents (including unpublished) - Super admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Require super admin access
    await requireMinimumLevel(request, 'super_admin');

    const supabaseAdmin = createAdminClient();

    const { data: documents, error } = await supabaseAdmin
      .from('mentor_documents')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('[Admin Documents API] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({ success: true, documents: documents || [] });
  } catch (error: any) {
    console.error('[Admin Documents API] Error:', error);
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

/**
 * POST /api/admin/documents
 * Create new document - Super admin only
 */
export async function POST(request: NextRequest) {
  try {
    await requireMinimumLevel(request, 'super_admin');

    const body = await request.json();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('mentor_documents')
      .insert({
        title: body.title,
        description: body.description || null,
        file_url: body.file_url,
        file_type: body.file_type,
        file_size: body.file_size || null,
        thumbnail_url: body.thumbnail_url || null,
        category: body.category || null,
        order_index: body.order_index || 0,
        is_published: body.is_published !== undefined ? body.is_published : true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Admin Documents API] Create error:', error);
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }

    return NextResponse.json({ success: true, document: data });
  } catch (error: any) {
    console.error('[Admin Documents API] Error:', error);
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/documents
 * Delete document by ID - Super admin only
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireMinimumLevel(request, 'super_admin');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from('mentor_documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Admin Documents API] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Documents API] Error:', error);
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
