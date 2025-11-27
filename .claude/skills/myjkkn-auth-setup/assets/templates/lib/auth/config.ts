/**
 * MyJKKN Authentication Configuration
 * 
 * Update the environment variables in .env.local:
 * - NEXT_PUBLIC_AUTH_SERVER_URL: MyJKKN SSO server URL
 * - MYJKKN_CLIENT_ID: Your registered application ID
 * - MYJKKN_API_KEY: Your application API key (keep secret!)
 * - NEXT_PUBLIC_AUTH_REDIRECT_URI: OAuth callback URL
 */

export const authConfig = {
  // MyJKKN Auth Server URL
  authServerUrl: process.env.NEXT_PUBLIC_AUTH_SERVER_URL || 'https://sso.jkkn.ai',
  
  // Application credentials (provided by MyJKKN admin)
  clientId: process.env.MYJKKN_CLIENT_ID || '',
  apiKey: process.env.MYJKKN_API_KEY || '',
  
  // OAuth redirect URI - must match registered URI exactly
  redirectUri: process.env.NEXT_PUBLIC_AUTH_REDIRECT_URI || 'http://localhost:3000/callback',
  
  // Token expiry buffer (refresh token slightly before expiry)
  tokenExpiryBuffer: 5 * 60 * 1000, // 5 minutes in milliseconds
};

// Validate configuration on startup
if (typeof window === 'undefined') {
  // Server-side validation
  const missingVars: string[] = [];
  
  if (!authConfig.authServerUrl) missingVars.push('NEXT_PUBLIC_AUTH_SERVER_URL');
  if (!authConfig.clientId) missingVars.push('MYJKKN_CLIENT_ID');
  if (!authConfig.apiKey) missingVars.push('MYJKKN_API_KEY');
  if (!authConfig.redirectUri) missingVars.push('NEXT_PUBLIC_AUTH_REDIRECT_URI');
  
  if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn(
      `[Auth Config] Missing environment variables: ${missingVars.join(', ')}`
    );
  }
}
