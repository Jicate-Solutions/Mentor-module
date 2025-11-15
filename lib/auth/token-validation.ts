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
 * Validates an access token with the MyJKKN Auth Server
 */
export async function validateToken(accessToken: string): Promise<ValidationResponse> {
  try {
    const response = await fetch(`${authConfig.authServerUrl}/api/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: accessToken,
        child_app_id: authConfig.clientId,
      }),
    });

    if (!response.ok) {
      return { valid: false, error: 'Token validation failed' };
    }

    const data = await response.json();
    return { valid: true, user: data.user };
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false, error: 'Validation request failed' };
  }
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
