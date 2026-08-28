export interface JwtPayload {
  sub: string; // userId
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
}
