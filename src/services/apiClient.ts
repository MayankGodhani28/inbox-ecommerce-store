export interface ApiErrorPayload {
  code: string;
  message: string;
  fields?: Record<string, string>;
  requestId?: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  requestId?: string;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message || 'API request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code || 'UNKNOWN_ERROR';
    this.fields = payload.fields;
    this.requestId = payload.requestId;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Accept': 'application/json',
  };

  if (options.body && !(options.body instanceof FormData)) {
    (defaultHeaders as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorPayload: ApiErrorPayload = body?.error || {
      code: `HTTP_${response.status}`,
      message: response.statusText || 'Request failed',
    };

    const isAuthProbe = url.includes('/auth/me') || url.includes('/super-admin/my-application');
    if (response.status === 401 && !isAuthProbe && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('inbox:auth-required', {
          detail: { message: errorPayload.message || 'Authentication required', url },
        })
      );
    }

    throw new ApiError(response.status, errorPayload);
  }

  return (body?.data ?? body) as T;
}

export const apiClient = {
  get: <T = any>(url: string, options?: RequestInit) =>
    apiRequest<T>(url, { ...options, method: 'GET' }),
  post: <T = any>(url: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(url, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T = any>(url: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T = any>(url: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(url, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(url: string, options?: RequestInit) =>
    apiRequest<T>(url, { ...options, method: 'DELETE' }),
};
