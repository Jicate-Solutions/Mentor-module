// app/api/admin/guide/sections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: sections, error } = await supabase
      .from('guide_sections')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;

    return NextResponse.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data: section, error } = await supabase
      .from('guide_sections')
      .insert({
        title: body.title,
        slug: body.slug,
        description: body.description,
        icon: body.icon,
        order_index: body.order_index,
        is_published: body.is_published ?? false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500 }
    );
  }
}
