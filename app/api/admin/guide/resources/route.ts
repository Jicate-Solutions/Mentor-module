// app/api/admin/guide/resources/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: resources, error } = await supabase
      .from('guide_resources')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;

    return NextResponse.json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data: resource, error } = await supabase
      .from('guide_resources')
      .insert({
        title: body.title,
        description: body.description,
        resource_type: body.resource_type,
        file_url: body.file_url,
        file_size: body.file_size,
        category: body.category,
        order_index: body.order_index,
        is_published: body.is_published ?? false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    );
  }
}
