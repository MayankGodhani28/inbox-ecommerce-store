const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isSafeApiRequest(
  method: string,
  requestPath: string,
  headers: { origin?: string; requestedWith?: string; fetchSite?: string },
  allowedOrigins: readonly string[],
): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return true;
  if (method.toUpperCase() === 'POST' && requestPath === '/api/payments/webhook') return true;
  if (headers.requestedWith !== 'XMLHttpRequest') return false;
  if (headers.origin) return allowedOrigins.includes(headers.origin);
  return headers.fetchSite !== 'cross-site';
}
