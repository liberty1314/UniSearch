export const AUTH_ROUTES = ['/login', '/register', '/apikey', '/admin/login'] as const;

export type AuthRoute = (typeof AUTH_ROUTES)[number];
export type AuthDirection = -1 | 0 | 1;

export interface AuthTransitionState {
  authTransition?: 'forward' | 'backward';
  from?: string;
}

const AUTH_ROUTE_SET = new Set<string>(AUTH_ROUTES);

export function isAuthRoute(pathname: string): pathname is AuthRoute {
  return AUTH_ROUTE_SET.has(pathname);
}

const AUTH_DIRECTION_MAP: Record<string, AuthDirection> = {
  '/login->/register': 1,
  '/register->/login': -1,
  '/login->/apikey': 1,
  '/apikey->/login': -1,
  '/login->/admin/login': 1,
  '/admin/login->/login': -1,
};

function parseDirectionFromState(state?: AuthTransitionState | null): AuthDirection | null {
  if (!state?.authTransition) {
    return null;
  }
  return state.authTransition === 'forward' ? 1 : -1;
}

export function resolveAuthDirection(
  from: string | undefined | null,
  to: string,
  state?: AuthTransitionState | null,
): AuthDirection {
  if (!isAuthRoute(to)) {
    return 0;
  }

  if (from && isAuthRoute(from)) {
    const mappedDirection = AUTH_DIRECTION_MAP[`${from}->${to}`];
    if (mappedDirection) {
      return mappedDirection;
    }
  }

  return parseDirectionFromState(state) ?? 0;
}
