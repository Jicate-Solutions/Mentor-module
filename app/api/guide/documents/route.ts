import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { MentorDocument } from '@/lib/types/documents';

/**
 * GET /api/guide/documents
 * Get all published mentor documents
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: documents, error } = await supabaseAdmin
      .from('mentor_documents')
      .select('*')
      .eq('is_published', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('[Documents API] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
    });
  } catch (error) {
    console.error('[Documents API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
