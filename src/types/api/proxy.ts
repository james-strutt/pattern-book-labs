export interface ProxyRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string | FormData | Blob | ArrayBuffer;
  timeout?: number;
  signal?: AbortSignal;
}

export type ProxyResponse<T = unknown> = T | string;

export interface ProxyErrorResponse {
  status: number;
  statusText: string;
  message: string;
  url: string;
}

export interface ProxyTimeoutError extends Error {
  name: "AbortError";
  timeout: number;
  url: string;
}
