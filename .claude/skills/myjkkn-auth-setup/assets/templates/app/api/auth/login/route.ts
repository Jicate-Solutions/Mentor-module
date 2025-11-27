/**
 * Login API Route
 * 
 * Redirects user to MyJKKN SSO login page.
 */

import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/config';

export async function GET() {
  // Build MyJKKN login URL
  const loginUrl = new URL(`${authConfig.authServerUrl}/login`);
  loginUrl.searchParams.set('app_id', authConfig.clientId);
  loginUrl.searchParams.set('redirect_uri', authConfig.redirectUri);

  // Redirect to MyJKKN login
  return NextResponse.redirect(loginUrl.toString());
}
