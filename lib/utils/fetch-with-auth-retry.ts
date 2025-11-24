/**
 * Fetch wrapper that automatically retries requests with refreshed token on 401 errors
 * This prevents users from seeing "Unauthorized" errors when their token expires
 */

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Refresh the access token using the refresh token
 * Uses a singleton pattern to prevent multiple simultaneous refresh attempts
 */
async function refreshTokenIfNeeded(): Promise<boolean> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Start refreshing
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        console.error('[Fetch Auth Retry] No refresh token available');
        return false;
      }

      console.log('[Fetch Auth Retry] Attempting to refresh token...');

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        console.error('[Fetch Auth Retry] Token refresh failed');
        return false;
      }

      const data = await response.json();

      // Update tokens
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      const expiryTime = Date.now() + data.expires_in * 1000;
      localStorage.setItem('token_expires_at', expiryTime.toString());

      console.log('[Fetch Auth Retry] ✓ Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('[Fetch Auth Retry] Error refreshing token:', error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Fetch wrapper that automatically retries on 401 errors after refreshing token
 *
 * Usage:
 * ```typescript
 * const response = await fetchWithAuthRetry('/api/endpoint', {
 *   headers: { 'Authorization': `Bearer ${accessToken}` }
 * });
 * ```
 */
export async function fetchWithAuthRetry(
  url: string,
  options?: RequestInit,
  maxRetries: number = 1
): Promise<Response> {
  let attempt = 0;

  while (attempt <= maxRetries) {
    // Get current access token
    const accessToken = localStorage.getItem('access_token');

    // Add Authorization header if token exists and not already set
    const headers = new Headers(options?.headers || {});
    if (accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    // Make the request
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If not 401 or this was the last retry, return the response
    if (response.status !== 401 || attempt >= maxRetries) {
      return response;
    }

    // Got 401 - try to refresh token
    console.log(`[Fetch Auth Retry] Got 401 on attempt ${attempt + 1}, refreshing token...`);

    const refreshed = await refreshTokenIfNeeded();

    if (!refreshed) {
      console.error('[Fetch Auth Retry] Token refresh failed, returning 401 response');
      return response;
    }

    // Token refreshed successfully, retry the request
    attempt++;
    console.log(`[Fetch Auth Retry] Retrying request (attempt ${attempt + 1})...`);
  }

  // This shouldn't be reached, but TypeScript needs it
  throw new Error('Max retries exceeded');
}

/**
 * Hook-friendly version that can be used in React components
 * Returns a wrapped fetch function that automatically retries with token refresh
 */
export function useFetchWithAuthRetry() {
  return fetchWithAuthRetry;
}
