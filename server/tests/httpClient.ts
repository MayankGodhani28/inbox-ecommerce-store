export function csrfFetch(input: string | URL | Request, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('X-Requested-With', 'XMLHttpRequest');
  return fetch(input, { ...init, headers });
}
