import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/guide/documents/[id]
 * Get a specific published document by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabaseAdmin = createAdminClient();

    const { data: document, error } = await supabaseAdmin
      .from('mentor_documents')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('[Document API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}
