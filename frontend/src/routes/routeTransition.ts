import {
  resolveAuthDirection,
  type AuthTransitionState,
  isAuthRoute,
} from '@/components/auth/authRouteMotion';

export type RouteFamily =
  | 'home'
  | 'search'
  | 'resource-detail'
  | 'auth'
  | 'account'
  | 'admin'
  | 'fallback';

export type RouteTransitionAnimation = 'shared-axis' | 'fade' | 'none';
export type RouteScrollMode = 'top' | 'restore' | 'preserve';
export type RouteDirection = -1 | 0 | 1;

export interface RouteTransitionState extends Partial<AuthTransitionState> {
  routeTransition?: 'forward' | 'backward';
  restoreScroll?: boolean;
  scrollY?: number;
  transitionSource?: string;
}

export interface RouteTransitionResult {
  family: RouteFamily | 'search-flow';
  direction: RouteDirection;
  animation: RouteTransitionAnimation;
  shouldBypass: boolean;
  scrollMode: RouteScrollMode;
}

interface ResolveRouteTransitionInput {
  from?: string | null;
  to: string;
  state?: RouteTransitionState | null;
}

const SEARCH_FLOW_RANK: Record<'home' | 'search' | 'resource-detail', number> = {
  home: 0,
  search: 1,
  'resource-detail': 2,
};

export function getRouteFamily(pathname: string): RouteFamily {
  if (pathname === '/') {
    return 'home';
  }

  if (pathname === '/search') {
    return 'search';
  }

  if (pathname.startsWith('/resource/')) {
    return 'resource-detail';
  }

  if (isAuthRoute(pathname)) {
    return 'auth';
  }

  if (pathname === '/account') {
    return 'account';
  }

  if (pathname.startsWith('/admin')) {
    return 'admin';
  }

  return 'fallback';
}

function parseDirectionFromState(
  state?: RouteTransitionState | null,
): RouteDirection | null {
  if (!state?.routeTransition) {
    return null;
  }

  return state.routeTransition === 'forward' ? 1 : -1;
}

function resolveSearchFlowDirection(
  fromFamily: 'home' | 'search' | 'resource-detail',
  toFamily: 'home' | 'search' | 'resource-detail',
  state?: RouteTransitionState | null,
): RouteDirection {
  const directionFromState = parseDirectionFromState(state);
  if (directionFromState) {
    return directionFromState;
  }

  const fromRank = SEARCH_FLOW_RANK[fromFamily];
  const toRank = SEARCH_FLOW_RANK[toFamily];

  if (fromRank === toRank) {
    return 0;
  }

  return toRank > fromRank ? 1 : -1;
}

export function resolveRouteTransition({
  from,
  to,
  state,
}: ResolveRouteTransitionInput): RouteTransitionResult {
  const toFamily = getRouteFamily(to);
  const fromFamily = from ? getRouteFamily(from) : null;

  if (toFamily === 'admin' || fromFamily === 'admin' || toFamily === 'fallback') {
    return {
      family: toFamily,
      direction: 0,
      animation: 'none',
      shouldBypass: true,
      scrollMode: 'top',
    };
  }

  if (
    (toFamily === 'home' || toFamily === 'search' || toFamily === 'resource-detail') &&
    (fromFamily === 'home' || fromFamily === 'search' || fromFamily === 'resource-detail')
  ) {
    return {
      family: 'search-flow',
      direction: resolveSearchFlowDirection(fromFamily, toFamily, state),
      animation: 'shared-axis',
      shouldBypass: false,
      scrollMode:
        state?.restoreScroll && typeof state.scrollY === 'number' ? 'restore' : 'top',
    };
  }

  if (toFamily === 'auth') {
    return {
      family: 'auth',
      direction: resolveAuthDirection(from, to, state),
      animation: 'fade',
      shouldBypass: false,
      scrollMode: 'top',
    };
  }

  return {
    family: toFamily,
    direction: parseDirectionFromState(state) ?? 0,
    animation: 'fade',
    shouldBypass: false,
    scrollMode:
      state?.restoreScroll && typeof state.scrollY === 'number' ? 'restore' : 'top',
  };
}
