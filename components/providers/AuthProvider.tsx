'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { JKKNUser, isTokenExpired, calculateExpiryTime } from '@/lib/auth/token-validation';
import { clearCache, clearCacheByPrefix } from '@/lib/utils/session-cache';

interface AuthContextType {
  user: JKKNUser | null;
  loading: boolean;
  accessToken: string | null;
  login: () => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      const expiresAt = localStorage.getItem('token_expires_at');
      if (token && expiresAt && !isTokenExpired(parseInt(expiresAt, 10))) {
        return token;
      }
    }
    return null;
  });

  const [user, setUser] = useState<JKKNUser | null>(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          return JSON.parse(userStr) as JKKNUser;
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [tokenExpiresAt, setTokenExpiresAt] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const expiresAt = localStorage.getItem('token_expires_at');
      if (expiresAt) {
        const expiryTime = parseInt(expiresAt, 10);
        if (!isTokenExpired(expiryTime)) {
          return expiryTime;
        }
      }
    }
    return 0;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      const userStr = localStorage.getItem('user');
      const expiresAt = localStorage.getItem('token_expires_at');
      if (token && userStr && expiresAt && !isTokenExpired(parseInt(expiresAt, 10))) {
        return false;
      }
    }
    return true;
  });

  // Handle edge cases lazy init didn't cover (expired token needs refresh)
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const refreshTokenValue = localStorage.getItem('refresh_token');
    const expiresAt = localStorage.getItem('token_expires_at');

    if (token && expiresAt) {
      const expiryTime = parseInt(expiresAt, 10);
      if (isTokenExpired(expiryTime) && refreshTokenValue) {
        refreshAccessToken();
        return;
      }
    }

    // If lazy init already set loading=false, this is a no-op
    setLoading(false);
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!accessToken || !tokenExpiresAt) return;

    const timeUntilExpiry = tokenExpiresAt - Date.now();
    const refreshTime = timeUntilExpiry - 5 * 60 * 1000; // Refresh 5 minutes before expiry

    if (refreshTime > 0) {
      const timer = setTimeout(() => {
        refreshAccessToken();
      }, refreshTime);

      return () => clearTimeout(timer);
    }
  }, [accessToken, tokenExpiresAt]);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const refreshTokenValue = localStorage.getItem('refresh_token');

    if (!refreshTokenValue) {
      logout();
      return false;
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      // Update tokens and user
      const expiryTime = calculateExpiryTime(data.expires_in);

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token_expires_at', expiryTime.toString());

      setAccessToken(data.access_token);
      setUser(data.user);
      setTokenExpiresAt(expiryTime);
      setLoading(false);

      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      setLoading(false);
      logout();
      return false;
    }
  }, []);

  const login = useCallback(() => {
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_APP_ID!,
      redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
      response_type: 'code',
      scope: 'read write profile',
      state: state,
    });

    const authUrl = `${process.env.NEXT_PUBLIC_AUTH_SERVER_URL}/api/auth/authorize?${params}`;

    // Debug logging
    console.log('========================================');
    console.log('OAuth Authorization Request:');
    console.log('========================================');
    console.log('Client ID:', process.env.NEXT_PUBLIC_APP_ID);
    console.log('Redirect URI:', process.env.NEXT_PUBLIC_REDIRECT_URI);
    console.log('Full Auth URL:', authUrl);
    console.log('========================================');

    window.location.href = authUrl;
  }, []);

  const logout = useCallback(() => {
    // Clear all auth data
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('session_id');
    localStorage.removeItem('oauth_state');

    // Clear all session caches on logout
    clearCache('dashboard_cache');
    clearCache('mentor_directory');
    clearCacheByPrefix('mentor_detail_');
    clearCacheByPrefix('assigned_students_');
    clearCacheByPrefix('counseling_');
    clearCacheByPrefix('idp_plans_');
    clearCacheByPrefix('feedback_');
    clearCacheByPrefix('student_search_');

    setAccessToken(null);
    setUser(null);
    setTokenExpiresAt(0);

    // Redirect to home page
    window.location.href = '/';
  }, []);

  // Handle session expiry from fetchWithAuthRetry
  useEffect(() => {
    const handleSessionExpired = () => {
      console.log('[AuthProvider] Session expired event received, logging out...');
      logout();
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        accessToken,
        login,
        logout,
        refreshToken: refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
