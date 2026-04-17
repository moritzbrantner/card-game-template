export type AuthPermission = string;
export type AuthRole = string;
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  roles: AuthRole[];
  permissions: AuthPermission[];
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: string;
  isAuthenticated: boolean;
  provider?: string;
  providerMetadata?: Record<string, string>;
};

export type AuthState = {
  status: AuthStatus;
  session: AuthSession | null;
  error?: string | null;
};

export type AuthConfig = {
  provider: string;
  cookieName: string;
  publicRoutes: string[];
  loginRoute: string;
  logoutRoute: string;
  providerConfig?: Record<string, string>;
};

export type AuthRedirectInput = {
  redirectTo?: string;
};

export interface AuthClient {
  getSession(): Promise<AuthSession | null> | AuthSession | null;
  login(input?: AuthRedirectInput): Promise<void> | void;
  logout(input?: AuthRedirectInput): Promise<void> | void;
  refreshSession(): Promise<AuthSession | null> | AuthSession | null;
}

export interface AuthServerAdapter<ReadInput = unknown, WriteInput = unknown> {
  readSession(input: ReadInput): Promise<AuthSession | null> | AuthSession | null;
  writeSession(input: WriteInput, session: AuthSession): Promise<void> | void;
  clearSession(input: WriteInput): Promise<void> | void;
  requireAuth?(input: ReadInput): Promise<AuthSession> | AuthSession;
}

export function isSessionActive(
  session: AuthSession | null,
  now = new Date(),
): session is AuthSession {
  if (!session?.isAuthenticated) {
    return false;
  }

  return new Date(session.expiresAt).getTime() > now.getTime();
}

export function createAuthState(session: AuthSession | null): AuthState {
  return {
    status: isSessionActive(session) ? 'authenticated' : 'unauthenticated',
    session: isSessionActive(session) ? session : null,
    error: null,
  };
}
