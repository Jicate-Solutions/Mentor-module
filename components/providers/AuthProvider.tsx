'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { JKKNUser, isTokenExpired, calculateExpiryTime } from '@/lib/auth/token-validation';
import { authConfig } from '@/lib/auth/config';

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
  const [user, setUser] = useState<JKKNUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number>(0);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const refreshTokenValue = localStorage.getItem('refresh_token');
    const userStr = localStorage.getItem('user');
    const expiresAt = localStorage.getItem('token_expires_at');

    if (token && userStr && expiresAt) {
      const expiryTime = parseInt(expiresAt, 10);

      // Check if token is expired
      if (isTokenExpired(expiryTime) && refreshTokenValue) {
        // Token expired, try to refresh
        refreshAccessToken();
      } else if (!isTokenExpired(expiryTime)) {
        // Token still valid
        setAccessToken(token);
        setUser(JSON.parse(userStr));
        setTokenExpiresAt(expiryTime);
      }
    }

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

      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout();
      return false;
    }
  }, []);

  const login = useCallback(() => {
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      client_id: authConfig.clientId,
      redirect_uri: authConfig.redirectUri,
      response_type: 'code',
      scope: authConfig.scopes,
      state: state,
    });

    const authUrl = `${authConfig.authServerUrl}/api/auth/authorize?${params}`;
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

    setAccessToken(null);
    setUser(null);
    setTokenExpiresAt(0);

    // Redirect to home page
    window.location.href = '/';
  }, []);

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
