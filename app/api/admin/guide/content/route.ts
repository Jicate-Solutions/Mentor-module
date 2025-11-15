// app/api/admin/guide/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const sectionId = searchParams.get('section_id');

    let query = supabase
      .from('guide_content')
      .select('*, section:guide_sections(title)')
      .order('order_index', { ascending: true });

    if (sectionId) {
      query = query.eq('section_id', sectionId);
    }

    const { data: content, error } = await query;

    if (error) throw error;

    return NextResponse.json(content);
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data: content, error } = await supabase
      .from('guide_content')
      .insert({
        section_id: body.section_id,
        title: body.title,
        content: body.content,
        content_type: body.content_type,
        order_index: body.order_index,
        metadata: body.metadata || {},
        is_published: body.is_published ?? false,
      })
      .select('*, section:guide_sections(title)')
      .single();

    if (error) throw error;

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    console.error('Error creating content:', error);
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    );
  }
}
