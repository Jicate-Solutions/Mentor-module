/**
 * Get the redirect URI for OAuth flow
 * Priority:
 * 1. NEXT_PUBLIC_REDIRECT_URI (if explicitly set)
 * 2. NEXT_PUBLIC_APP_URL + /callback (dynamic construction)
 * 3. Fallback to localhost for development
 */
function getRedirectUri(): string {
  // If explicit redirect URI is set, use it
  if (process.env.NEXT_PUBLIC_REDIRECT_URI) {
    return process.env.NEXT_PUBLIC_REDIRECT_URI;
  }

  // Construct from app URL if available
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ''); // Remove trailing slash
    return `${appUrl}/callback`;
  }

  // Fallback for development
  return 'http://localhost:3000/callback';
}

export const authConfig = {
  authServerUrl: process.env.NEXT_PUBLIC_AUTH_SERVER_URL || 'https://auth.jkkn.ai',
  clientId: process.env.NEXT_PUBLIC_APP_ID || '',
  redirectUri: getRedirectUri(),
  apiKey: process.env.API_KEY || '',
  scopes: 'read write profile',
  tokenExpiryBuffer: 5 * 60 * 1000, // 5 minutes buffer before token expiry
} as const;

export type AuthConfig = typeof authConfig;
