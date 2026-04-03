import jwt from 'jsonwebtoken';
import type { IUser } from '../models/User';

const JWT_SECRET = import.meta.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(user: IUser): string {
  const payload: JWTPayload = {
    userId: user._id.toString(),
    email: user.email,
    name: user.name
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '30d' // Token válido por 30 días
  });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract user from request cookies
 */
export function getUserFromCookie(cookieHeader: string | null): JWTPayload | null {
  if (!cookieHeader) return null;

  const cookies = parseCookies(cookieHeader);
  const token = cookies['auth-token'];

  if (!token) return null;

  return verifyToken(token);
}

/**
 * Parse cookie header string into object
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split('=');
    cookies[name] = decodeURIComponent(value);
    return cookies;
  }, {} as Record<string, string>);
}

/**
 * Exchange Google OAuth code for user info
 */
export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: import.meta.env.GOOGLE_CLIENT_ID || '',
      client_secret: import.meta.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Get Google user info from access token
 */
export async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return await response.json();
}
