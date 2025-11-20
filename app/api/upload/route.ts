import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // Check for Authorization header to ensure request is from authenticated client
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Upload API] No authorization header found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = formData.get('bucket') as string || 'documents'; // Default to 'documents' bucket
    const path = formData.get('path') as string || '';

    console.log('[Upload API] Upload request:', {
      fileName: file?.name,
      fileSize: file?.size,
      bucket,
      path
    });

    if (!file) {
      console.error('[Upload API] No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      console.error('[Upload API] File size exceeds limit:', file.size);
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomString}.${fileExt}`;
    const filePath = path ? `${path}/${fileName}` : fileName;

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    console.log('[Upload API] Uploading to bucket:', bucket, 'path:', filePath);
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('[Upload API] Supabase storage error:', {
        message: error.message,
        name: error.name,
        bucket,
        filePath
      });
      return NextResponse.json({
        error: error.message,
        details: `Failed to upload to bucket '${bucket}': ${error.message}`
      }, { status: 500 });
    }

    console.log('[Upload API] Upload successful:', data.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    console.log('[Upload API] Public URL generated:', urlData.publicUrl);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
  } catch (error: any) {
    console.error('[Upload API] Unexpected error:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json({
      error: error.message || 'Upload failed',
      details: 'An unexpected error occurred during file upload'
    }, { status: 500 });
  }
}
