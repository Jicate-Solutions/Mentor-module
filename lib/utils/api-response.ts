import { NextResponse } from 'next/server';

export function ok<T>(data: T, meta?: { total?: number }): NextResponse {
  return NextResponse.json({ success: true, data, ...(meta && { meta }) });
}

export function err(message: string, status: number, details?: string): NextResponse {
  return NextResponse.json(
    { success: false, error: message, ...(details && { details }) },
    { status }
  );
}
