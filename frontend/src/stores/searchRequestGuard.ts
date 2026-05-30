let latestSearchRequestId = 0;

export function createSearchRequestId(): number {
  latestSearchRequestId += 1;
  return latestSearchRequestId;
}

export function invalidateSearchRequests(): void {
  latestSearchRequestId += 1;
}

export function isLatestSearchRequest(requestId: number): boolean {
  return requestId === latestSearchRequestId;
}

export function resetSearchRequestGuard(): void {
  latestSearchRequestId = 0;
}
