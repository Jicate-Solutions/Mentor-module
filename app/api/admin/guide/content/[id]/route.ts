// app/api/admin/guide/content/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data: content, error } = await supabase
      .from('guide_content')
      .update({
        section_id: body.section_id,
        title: body.title,
        content: body.content,
        content_type: body.content_type,
        order_index: body.order_index,
        metadata: body.metadata,
        is_published: body.is_published,
      })
      .eq('id', id)
      .select('*, section:guide_sections(title)')
      .single();

    if (error) throw error;

    return NextResponse.json(content);
  } catch (error) {
    console.error('Error updating content:', error);
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('guide_content')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting content:', error);
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}
