import logger from "@/lib/logger";
import type { ProxyRequestOptions, ProxyResponse, ProxyTimeoutError } from "@/types/api/proxy";
import { SERVICE_ENDPOINTS } from "@/utils/config/serviceEndpoints";
import { PROXY_CONFIG } from "@/utils/config/proxyConfig";

const MAX_GET_QUERY_URL_LENGTH = 2000;
const DEFAULT_PROXY_TIMEOUT_MS = 120_000;
const DEFAULT_EXPORT_TIMEOUT_MS = 240_000;
const EXPORT_IMAGE_TIMEOUT_MS = 300_000;
const LOG_URL_MAX_LENGTH = 160;
const ERROR_BODY_SNIPPET_MAX = 200;
const HTML_ERROR_SNIPPET_MAX = 200;
const RETRY_BACKOFF_MS_PER_ATTEMPT = 3000;
const MAX_RETRIES_SPATIAL_PORTAL_EXPORT = 2;
const MAX_RETRIES_PORTAL_SPATIAL = 1;

const RECOVERABLE_ERROR_SUBSTRINGS = [
  "failed to fetch",
  "network",
  "timed out",
  "etimedout",
  "econn",
  "bad gateway",
  "gateway timeout",
  "service unavailable",
] as const;

export function isRailwayStationQuery(url: string): boolean {
  return url.includes("services.ga.gov.au") && url.includes("Foundation_Rail_Infrastructure");
}

function safeTargetUrlForLog(url: string): string {
  try {
    const parsed = new URL(url, globalThis.location?.origin ?? "https://localhost");
    const hasQuery = parsed.search.length > 0;
    return hasQuery
      ? `${parsed.origin}${parsed.pathname}?…(${parsed.search.length} chars)`
      : `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.length > LOG_URL_MAX_LENGTH ? `${url.slice(0, LOG_URL_MAX_LENGTH)}…` : url;
  }
}

function ensureFormPostHeaders(options: ProxyRequestOptions): void {
  if (!options.method || options.method === "GET") {
    options.method = "POST";
  }
  options.headers ??= {};
  options.headers["Content-Type"] ??= "application/x-www-form-urlencoded";
}

type QueryBodyPolicy = "merge-long-url" | "replace-if-empty";

function moveQueryStringToBody(
  url: string,
  options: ProxyRequestOptions,
  policy: QueryBodyPolicy,
): { url: string; options: ProxyRequestOptions } {
  const shouldSplit =
    url.includes("?") && (policy === "merge-long-url" ? url.length > MAX_GET_QUERY_URL_LENGTH : !options.body);

  if (!shouldSplit) {
    return { url, options };
  }

  const parts = url.split("?", 2);
  const baseUrl = parts[0];
  const queryString = parts[1];
  let nextUrl = url;
  if (baseUrl) {
    nextUrl = baseUrl;
  }
  if (queryString) {
    if (policy === "merge-long-url") {
      options.body ??= queryString;
    } else {
      options.body = queryString;
    }
  }

  return { url: nextUrl, options };
}

function configureGeometryServerRequest(
  url: string,
  options: ProxyRequestOptions,
): { url: string; options: ProxyRequestOptions } {
  ensureFormPostHeaders(options);
  return moveQueryStringToBody(url, options, "merge-long-url");
}

function configureQueryRequest(
  url: string,
  options: ProxyRequestOptions,
): { url: string; options: ProxyRequestOptions } {
  ensureFormPostHeaders(options);
  return moveQueryStringToBody(url, options, "replace-if-empty");
}

function configureSpatialPortalExport(
  url: string,
  options: ProxyRequestOptions,
): { url: string; options: ProxyRequestOptions } {
  options.headers ??= {};
  options.method = "POST";
  options.headers["Content-Type"] = "application/x-www-form-urlencoded";

  const moved = moveQueryStringToBody(url, options, "replace-if-empty");
  moved.options.headers ??= {};
  moved.options.headers["Accept"] = "image/png,*/*";
  moved.options.timeout = EXPORT_IMAGE_TIMEOUT_MS;
  return moved;
}

function configureExportRequest(
  url: string,
  options: ProxyRequestOptions,
): { url: string; options: ProxyRequestOptions } {
  options.headers ??= {};
  options.headers["Referer"] ??= globalThis.location.origin;

  if (url.includes("spatialportalarcgis.dpie.nsw.gov.au") && url.includes("/export")) {
    return configureSpatialPortalExport(url, options);
  }
  options.timeout ??= DEFAULT_EXPORT_TIMEOUT_MS;
  return { url, options };
}

export function isQueryRequest(url: string): boolean {
  const isArcGISOrGIS = url.includes("arcgis") || url.includes("/gis/") || url.includes("/server/rest/services/");
  const hasQueryEndpoint = url.includes("/query") || url.endsWith("/query");
  const hasQueryParams =
    url.includes("?") && (url.includes("geometryType=") || url.includes("spatialRel=") || url.includes("outFields="));

  return isArcGISOrGIS && (hasQueryEndpoint || hasQueryParams);
}

export function isExportRequest(url: string): boolean {
  const isArcGISOrGIS = url.includes("arcgis") || url.includes("/gis/");
  const hasExportEndpoint = url.includes("/export") || url.includes("/MapServer");

  return isArcGISOrGIS && hasExportEndpoint;
}

function configureRequestOptions(
  url: string,
  options: ProxyRequestOptions,
): { url: string; requestOptions: RequestInit } {
  let finalUrl = url;
  let nextOptions = options;

  if (finalUrl.includes("arcgis") && finalUrl.includes("GeometryServer")) {
    ({ url: finalUrl, options: nextOptions } = configureGeometryServerRequest(finalUrl, nextOptions));
  } else if (isQueryRequest(finalUrl)) {
    ({ url: finalUrl, options: nextOptions } = configureQueryRequest(finalUrl, nextOptions));
  } else if (isExportRequest(finalUrl)) {
    ({ url: finalUrl, options: nextOptions } = configureExportRequest(finalUrl, nextOptions));
  }

  const callerAccept = nextOptions.headers?.Accept ?? nextOptions.headers?.accept;
  const acceptHeader = callerAccept ?? "application/json, text/plain, */*";

  const requestOptions: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify({
      url: finalUrl,
      method: nextOptions.method ?? "GET",
      headers: {
        ...nextOptions.headers,
        Origin: globalThis.location.origin,
        Accept: acceptHeader,
      },
      body: nextOptions.body,
    }),
  };

  return { url: finalUrl, requestOptions };
}

function removeTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function getProxyUrlCandidates(): string[] {
  const envProxyBase = import.meta.env.VITE_PROXY_BASE_URL?.trim();
  const candidates = [
    PROXY_CONFIG.baseUrl,
    envProxyBase ? removeTrailingSlash(envProxyBase) : "",
    SERVICE_ENDPOINTS.PROXY_MAIN,
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(candidates));
}

function isRecoverableProxyTransportError(error: Error): boolean {
  if (error.name === "AbortError") {
    return true;
  }
  const message = error.message.toLowerCase();
  return RECOVERABLE_ERROR_SUBSTRINGS.some((fragment) => message.includes(fragment));
}

function handleErrorResponse(
  response: Response,
  errorText: string,
  url: string,
  isRailwayStation: boolean,
  attempt: number,
  maxRetries: number,
): never {
  const isHtmlError = errorText?.includes("<html") || errorText?.includes("<!DOCTYPE");
  const isExpectedError = response.status === 400 || response.status === 404 || response.status === 403;
  const logUrl = safeTargetUrlForLog(url);
  const snippet = errorText.substring(0, ERROR_BODY_SNIPPET_MAX);

  if (isRailwayStation) {
    logger.warn(
      "Proxy request failed for railway station query",
      { status: response.status, statusText: response.statusText, url: logUrl },
      "proxyRequest",
    );
  } else if (isExpectedError && isHtmlError) {
    logger.debug(
      "Proxy request failed (expected HTML error response)",
      { status: response.status, url: logUrl },
      "proxyRequest",
    );
  } else {
    logger.error(
      "Proxy request failed",
      {
        status: response.status,
        statusText: response.statusText,
        error: snippet,
        url: logUrl,
      },
      "proxyRequest",
    );
  }

  if (attempt < maxRetries) {
    throw new Error(`Proxy request failed (will retry): ${response.statusText}. ${snippet}`);
  }

  throw new Error(`Proxy request failed: ${response.statusText}. ${snippet}`);
}

function unwrapDoubleEncodedJson<T>(text: string): T {
  try {
    let parsed: unknown = JSON.parse(text);
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    return parsed as T;
  } catch {
    return text as T;
  }
}

async function handleResponse<T>(response: Response, url: string): Promise<ProxyResponse<T>> {
  const contentType = response.headers.get("content-type");
  const logUrl = safeTargetUrlForLog(url);

  if (contentType?.includes("image") || url.includes("/export") || url.includes("GetMap")) {
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: contentType ?? "image/png" });
    return URL.createObjectURL(blob);
  }

  if (contentType?.includes("text/html")) {
    const htmlSnippet = (await response.text()).slice(0, HTML_ERROR_SNIPPET_MAX);
    throw new Error(`Proxy returned HTML instead of data for ${url}: ${htmlSnippet}`);
  }

  if (contentType?.includes("text") || url.includes("maps.google.com/maps") || url.includes("google.com/maps")) {
    const text = await response.text();
    return unwrapDoubleEncodedJson<T>(text);
  }

  try {
    const result = await response.json();
    if (typeof result === "string") {
      return unwrapDoubleEncodedJson<T>(result);
    }
    return result as T;
  } catch (e) {
    const parseError = e as Error;
    logger.warn(
      "Failed to parse response as JSON, falling back to text",
      { error: parseError.message, url: logUrl },
      "proxyRequest",
    );
    const text = await response.text();
    if (!text) {
      throw new Error("Empty response from proxy server", { cause: e });
    }
    return unwrapDoubleEncodedJson<T>(text);
  }
}

function createTimeoutError(timeoutMs: number, url: string): ProxyTimeoutError {
  const err = new Error(`Request to proxy timed out after ${timeoutMs / 1000} seconds`) as ProxyTimeoutError;
  err.name = "AbortError";
  err.timeout = timeoutMs;
  err.url = url;
  return err;
}

function setupAbortController(
  signal?: AbortSignal,
  timeoutMs?: number,
): {
  timeoutId: ReturnType<typeof setTimeout> | null;
  abortSignal: AbortSignal;
} {
  if (signal) {
    return { timeoutId: null, abortSignal: signal };
  }

  const controller = new AbortController();
  const abortSignal = controller.signal;
  const timeoutId = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;
  return { timeoutId, abortSignal };
}

function clearTimeoutIfNeeded(timeoutId: ReturnType<typeof setTimeout> | null): void {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
}

async function waitBeforeRetry(attempt: number): Promise<void> {
  if (attempt > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS_PER_ATTEMPT * attempt));
  }
}

function handleAbortError(timeoutId: ReturnType<typeof setTimeout> | null, timeoutMs: number, url: string): never {
  clearTimeoutIfNeeded(timeoutId);
  logger.error(
    `Proxy request timed out after ${timeoutMs / 1000} seconds`,
    { url: safeTargetUrlForLog(url) },
    "proxyRequest",
  );
  throw createTimeoutError(timeoutMs, url);
}

async function executeRequestAttempt<T>(
  proxyUrl: string,
  requestOptions: RequestInit,
  url: string,
  abortSignal: AbortSignal,
  isRailwayStation: boolean,
  attempt: number,
  maxRetries: number,
): Promise<ProxyResponse<T>> {
  const response = await fetch(proxyUrl, {
    ...requestOptions,
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    handleErrorResponse(response, errorText, url, isRailwayStation, attempt, maxRetries);
  }

  return await handleResponse<T>(response, url);
}

async function executeRequestWithRetry<T>(
  proxyUrl: string,
  requestOptions: RequestInit,
  url: string,
  timeoutMs: number,
  maxRetries: number,
  isRailwayStation: boolean,
  signal?: AbortSignal,
): Promise<ProxyResponse<T>> {
  const { timeoutId, abortSignal } = setupAbortController(signal, timeoutMs);

  let lastError: Error | null = null;
  const logUrl = safeTargetUrlForLog(url);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await waitBeforeRetry(attempt);

      const result = await executeRequestAttempt<T>(
        proxyUrl,
        requestOptions,
        url,
        abortSignal,
        isRailwayStation,
        attempt,
        maxRetries,
      );

      clearTimeoutIfNeeded(timeoutId);
      return result;
    } catch (retryError) {
      const error = retryError as Error;
      lastError = error;

      if (error.name === "AbortError") {
        handleAbortError(timeoutId, timeoutMs, url);
      }

      if (attempt === maxRetries) {
        throw error;
      }

      logger.warn(`Attempt ${attempt + 1} failed, retrying...`, { error: error.message, url: logUrl }, "proxyRequest");
    }
  }

  throw lastError ?? new Error("Unknown error occurred during retry logic");
}

function logError(error: Error, url: string, isRailwayStation: boolean): void {
  const errorMessage = error.message || String(error);
  const logUrl = safeTargetUrlForLog(url);
  const isExpectedError =
    errorMessage.includes("Proxy request failed") &&
    (errorMessage.includes("400") ||
      errorMessage.includes("404") ||
      errorMessage.includes("403") ||
      errorMessage.includes("Bad Request"));

  if (isRailwayStation) {
    logger.warn(
      "Proxy request error for railway station query (suppressed)",
      { url: logUrl, error: errorMessage },
      "proxyRequest",
    );
    return;
  }

  if (isExpectedError) {
    logger.debug("Proxy request error (expected)", { url: logUrl, error: errorMessage }, "proxyRequest");
  } else {
    logger.error("Proxy request error", { url: logUrl, error: errorMessage, stack: error.stack }, "proxyRequest");
  }
}

function calculateMaxRetries(url: string): number {
  if (url.includes("spatialportalarcgis.dpie.nsw.gov.au") && url.includes("/export")) {
    return MAX_RETRIES_SPATIAL_PORTAL_EXPORT;
  }
  if (url.includes("portal.spatial.nsw.gov.au")) {
    return MAX_RETRIES_PORTAL_SPATIAL;
  }
  return 0;
}

function normaliseError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function handleProxyError(
  error: unknown,
  proxyUrl: string,
  nextProxyUrl: string | undefined,
  url: string,
  isRailwayStation: boolean,
  hasFallback: boolean,
): Error {
  const errorObj = normaliseError(error);
  logError(errorObj, url, isRailwayStation);

  if (!hasFallback) {
    return errorObj;
  }

  const recoverable = isRecoverableProxyTransportError(errorObj);
  logger.warn(
    recoverable
      ? "Primary proxy unavailable, trying fallback proxy endpoint"
      : "Primary proxy returned non-recoverable error; still attempting fallback proxy endpoint",
    {
      failedProxy: proxyUrl,
      nextProxy: nextProxyUrl,
      error: errorObj.message,
      targetUrl: safeTargetUrlForLog(url),
    },
    "proxyRequest",
  );

  return errorObj;
}

export async function proxyRequest<T = unknown>(
  url: string,
  options: ProxyRequestOptions = {},
): Promise<ProxyResponse<T>> {
  const proxyUrls = getProxyUrlCandidates();
  const isRailwayStation = isRailwayStationQuery(url);
  const { url: finalUrl, requestOptions } = configureRequestOptions(url, options);
  const timeoutMs = options.timeout ?? DEFAULT_PROXY_TIMEOUT_MS;
  const maxRetries = calculateMaxRetries(finalUrl);

  let lastError: Error | null = null;

  for (let i = 0; i < proxyUrls.length; i++) {
    const proxyUrl = proxyUrls[i];
    if (!proxyUrl) {
      continue;
    }

    try {
      return await executeRequestWithRetry<T>(
        proxyUrl,
        requestOptions,
        finalUrl,
        timeoutMs,
        maxRetries,
        isRailwayStation,
        options.signal,
      );
    } catch (error) {
      const hasFallback = i < proxyUrls.length - 1;
      const errorObj = handleProxyError(error, proxyUrl, proxyUrls[i + 1], url, isRailwayStation, hasFallback);
      lastError = errorObj;

      if (!hasFallback) {
        throw errorObj;
      }
    }
  }

  throw lastError ?? new Error("No proxy endpoints available");
}

export async function fetchViaProxy<T = unknown>(
  url: string,
  options: ProxyRequestOptions = {},
): Promise<ProxyResponse<T> | null> {
  try {
    return await proxyRequest<T>(url, options);
  } catch (error) {
    const errorObj = error as Error;
    logger.error("Error in fetchViaProxy", { error: errorObj.message, url: safeTargetUrlForLog(url) }, "fetchViaProxy");
    return null;
  }
}
