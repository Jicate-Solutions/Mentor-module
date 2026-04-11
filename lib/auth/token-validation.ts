import { authConfig } from './config';
import { createClient } from '@supabase/supabase-js';

export interface JKKNUser {
  id: string;
  email: string;
  full_name: string;
  // Resolved primary role (always a single string after resolvePrimaryRole).
  // Raw JKKN tokens may send string|string[], but callers must resolve before
  // constructing a JKKNUser.
  role: string;
  // JKKN may also send all assigned roles in a separate plural field
  roles?: string[];
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
 * Caches validation results for 15 minutes to reduce auth server load
 * Failed validations are cached for 10 seconds to prevent retry storms
 */
const validationCache = new Map<string, { result: ValidationResponse; expiresAt: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes (increased from 2)
const FAILED_CACHE_DURATION = 2 * 1000; // 2 seconds — short so a just-refreshed token gets re-validated quickly
const TIMEOUT_CACHE_DURATION = 5 * 1000; // 5 seconds for timeout/network errors (was 30s — too long)
const GRACE_PERIOD = 60 * 1000; // 1 minute grace period for expired cache during timeout

/**
 * Validates an access token with the MyJKKN Auth Server
 * Results are cached for 15 minutes to prevent excessive validation calls
 * Failed validations are cached for 10 seconds to prevent retry storms
 */
export async function validateToken(accessToken: string): Promise<ValidationResponse> {
  // Check cache first
  const cached = validationCache.get(accessToken);
  if (cached && Date.now() < cached.expiresAt) {
    console.log('[Token Validation] Using cached validation result');
    return cached.result;
  }

  // ── Fallback 1: Check user_sessions table in Supabase ──────────────
  // On Vercel serverless, in-memory cache is empty per invocation.
  // The session was stored in DB during login — use it to avoid auth server calls.
  // Uses direct createClient() to avoid importing server.ts (which needs next/headers).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: session } = await supabase
      .from('user_sessions')
      .select('user:users(*)')
      .eq('access_token', accessToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (session?.user) {
      const user = session.user as any;
      const result: ValidationResponse = {
        valid: true,
        user: {
          id: user.jkkn_user_id || user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          institution_id: user.institution_id || undefined,
          department_id: user.department_id || undefined,
        },
      };
      // Populate in-memory cache for subsequent calls in same instance
      validationCache.set(accessToken, {
        result,
        expiresAt: Date.now() + CACHE_DURATION,
      });
      console.log('[Token Validation] ✓ Validated via DB session (user:', user.id, ')');
      return result;
    }
  } catch (dbErr) {
    console.warn('[Token Validation] DB session lookup failed, falling back to auth server:', dbErr instanceof Error ? dbErr.message : dbErr);
  }
  }

  // ── Fallback 2: Validate with JKKN auth server ───────────────────
  try {
    console.log('[Token Validation] Validating token with auth server...');

    // Add timeout to prevent hanging on network issues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout (increased from 5)

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
      // Cache failures for 10 seconds to prevent retry storms
      validationCache.set(accessToken, {
        result,
        expiresAt: Date.now() + FAILED_CACHE_DURATION,
      });
      console.log('[Token Validation] ❌ Token validation failed, cached for 10s');
      return result;
    }

    const data = await response.json();

    // Check if user data is present or if validation failed
    if (!data.user || data.valid === false) {
      console.error('[Token Validation] No user data in response:', data);
      const result = { valid: false, error: data.error || 'No user data in token response' };
      // Cache failures for 10 seconds
      validationCache.set(accessToken, {
        result,
        expiresAt: Date.now() + FAILED_CACHE_DURATION,
      });
      console.log('[Token Validation] ❌ Invalid token response, cached for 10s');
      return result;
    }

    const result = { valid: true, user: data.user };

    // Cache successful validation
    validationCache.set(accessToken, {
      result,
      expiresAt: Date.now() + CACHE_DURATION,
    });

    console.log('[Token Validation] ✓ Token validated and cached for 15 minutes, user:', data.user?.id);
    return result;
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const errorMessage = isTimeout ? 'Auth server timeout' : 'Validation request failed';

    if (isTimeout) {
      console.error('[Token Validation] Request timed out - auth server may be unreachable');
    } else {
      console.error('[Token Validation] Validation request failed:', error);
    }

    // Fallback to expired-but-recent cache on timeout (grace period)
    // This allows recently authenticated users to continue working during auth server outages
    if (cached && cached.result.valid && Date.now() < cached.expiresAt + GRACE_PERIOD) {
      console.log('[Token Validation] ⚠️ Timeout - using expired cache (within grace period)');
      // Extend the cache slightly to avoid hammering auth server
      validationCache.set(accessToken, {
        result: cached.result,
        expiresAt: Date.now() + TIMEOUT_CACHE_DURATION,
      });
      return cached.result;
    }

    // Cache timeout/network errors to prevent retry storms
    const failResult: ValidationResponse = { valid: false, error: errorMessage };
    validationCache.set(accessToken, {
      result: failResult,
      expiresAt: Date.now() + TIMEOUT_CACHE_DURATION,
    });
    console.log('[Token Validation] ❌', errorMessage, '- cached for 5s');
    return failResult;
  }
}

/**
 * Pre-populate validation cache after successful login or token refresh.
 * This prevents unnecessary re-validation with the auth server when the token
 * was just issued. Without this, a slow auth server causes 401s on all API
 * calls even though the token is known-valid from the exchange.
 */
export function seedValidationCache(accessToken: string, user: JKKNUser): void {
  const result: ValidationResponse = { valid: true, user };
  validationCache.set(accessToken, {
    result,
    expiresAt: Date.now() + CACHE_DURATION,
  });
  console.log('[Token Validation] ✓ Cache seeded for token (user:', user.id, ')');
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
