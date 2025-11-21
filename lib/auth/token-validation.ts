import { authConfig } from './config';

export interface JKKNUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  institution_id?: string;
  department_id?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user: JKKNUser;
}

export interface ValidationResponse {
  valid: boolean;
  user?: JKKNUser;
  error?: string;
}

/**
 * Token validation cache
 * Caches validation results for 2 minutes to reduce auth server load
 */
const validationCache = new Map<string, { result: ValidationResponse; expiresAt: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

/**
 * Validates an access token with the MyJKKN Auth Server
 * Results are cached for 2 minutes to prevent excessive validation calls
 */
export async function validateToken(accessToken: string): Promise<ValidationResponse> {
  // Check cache first
  const cached = validationCache.get(accessToken);
  if (cached && Date.now() < cached.expiresAt) {
    console.log('[Token Validation] Using cached validation result');
    return cached.result;
  }

  try {
    console.log('[Token Validation] Validating token with auth server...');

    // Add timeout to prevent hanging on network issues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${authConfig.authServerUrl}/api/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: accessToken,
        child_app_id: authConfig.clientId,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const result = { valid: false, error: 'Token validation failed' };
      // Don't cache failures
      return result;
    }

    const data = await response.json();

    // Check if user data is present
    if (!data.user) {
      console.error('[Token Validation] No user data in response:', data);
      return { valid: false, error: 'No user data in token response' };
    }

    const result = { valid: true, user: data.user };

    // Cache successful validation
    validationCache.set(accessToken, {
      result,
      expiresAt: Date.now() + CACHE_DURATION,
    });

    console.log('[Token Validation] ✓ Token validated and cached, user:', data.user?.id);
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Token Validation] Request timed out - auth server may be unreachable');
      return { valid: false, error: 'Auth server timeout' };
    }
    console.error('[Token Validation] Validation request failed:', error);
    return { valid: false, error: 'Validation request failed' };
  }
}

/**
 * Clear expired entries from validation cache
 * Called periodically to prevent memory leaks
 */
function cleanupValidationCache() {
  const now = Date.now();
  for (const [token, entry] of validationCache.entries()) {
    if (now >= entry.expiresAt) {
      validationCache.delete(token);
    }
  }
}

// Cleanup cache every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupValidationCache, 5 * 60 * 1000);
}

/**
 * Checks if a token is expired based on the expires_in value
 */
export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt - authConfig.tokenExpiryBuffer;
}

/**
 * Calculates the expiry timestamp from expires_in seconds
 */
export function calculateExpiryTime(expiresIn: number): number {
  return Date.now() + expiresIn * 1000;
}

/**
 * Refreshes an access token using a refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  try {
    const response = await fetch(`${authConfig.authServerUrl}/api/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        app_id: authConfig.clientId,
        api_key: authConfig.apiKey,
      }),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}
