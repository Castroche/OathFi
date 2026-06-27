const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, code = "API_ERROR", status = 0, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type ApiResponse<T> =
  | {
      ok: true;
      data: T;
      message?: string;
    }
  | {
      ok: false;
      error: ApiErrorBody;
    };

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const json = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!json) {
    throw new ApiError("API returned an empty or invalid JSON response.", "INVALID_JSON", response.status);
  }

  if (!response.ok || json.ok === false) {
    const error = "error" in json ? json.error : undefined;
    throw new ApiError(
      error?.message || "API request failed",
      error?.code || "API_ERROR",
      response.status,
      error?.details,
    );
  }

  return json.data as T;
}

export async function apiJson<T>(path: string, body: unknown, options: RequestInit = {}) {
  return apiRequest<T>(path, {
    ...options,
    method: options.method ?? "POST",
    body: JSON.stringify(body),
  });
}

export function apiWsUrl(path: string) {
  const explicit = import.meta.env.VITE_WS_BASE_URL as string | undefined;
  if (explicit) {
    return `${explicit}${path}`;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (apiBase) {
    return `${apiBase.replace(/^http/, "ws")}${path}`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${path}`;
}
