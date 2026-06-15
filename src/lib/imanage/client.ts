import type { SessionData } from "@/types";

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  body: T;
  raw: string;
}

export class ImanageClient {
  constructor(private session: SessionData) {}

  private headers(json = true): HeadersInit {
    const h: HeadersInit = { "x-auth-token": this.session.authToken };
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = path.startsWith("http")
      ? path
      : `${this.session.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    const res = await fetch(url, {
      method,
      headers: this.headers(body !== undefined),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const raw = await res.text();
    let parsed: T;
    try {
      parsed = raw ? JSON.parse(raw) : ({} as T);
    } catch {
      parsed = raw as T;
    }

    return { ok: res.ok, status: res.status, body: parsed, raw };
  }

  get<T = unknown>(path: string) {
    return this.request<T>("GET", path);
  }

  post<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }

  put<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, body);
  }

  patch<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, body);
  }

  delete<T = unknown>(path: string) {
    return this.request<T>("DELETE", path);
  }
}
