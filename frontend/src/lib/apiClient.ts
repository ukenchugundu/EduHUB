import { readStoredAuth } from "@/lib/authSession";
import { resolveApiUrl } from "@/lib/apiUrl";

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRY_COUNT = 1;

const RETRIABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

interface ApiRequestErrorOptions {
  status?: number | null;
  body?: unknown;
  isNetworkError?: boolean;
  isTimeout?: boolean;
  isTransient?: boolean;
}

export interface JsonRequestConfig {
  fallbackError?: string;
  timeoutMs?: number;
  retries?: number;
  includeAuth?: boolean;
  jsonContentType?: boolean;
}

export class ApiRequestError extends Error {
  status: number | null;
  body: unknown;
  isNetworkError: boolean;
  isTimeout: boolean;
  isTransient: boolean;

  constructor(message: string, options: ApiRequestErrorOptions = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status ?? null;
    this.body = options.body;
    this.isNetworkError = options.isNetworkError ?? false;
    this.isTimeout = options.isTimeout ?? false;
    this.isTransient = options.isTransient ?? false;
  }
}

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const shouldAddJsonContentType = (body: RequestInit["body"]): boolean =>
  typeof body === "string";

const buildHeaders = (
  headers: HeadersInit | undefined,
  includeAuth: boolean,
  jsonContentType: boolean,
  body: RequestInit["body"],
): Headers => {
  const nextHeaders = new Headers(headers);
  const token = includeAuth ? readStoredAuth()?.token?.trim() : "";

  if (token && !nextHeaders.has("Authorization")) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (
    jsonContentType &&
    shouldAddJsonContentType(body) &&
    !nextHeaders.has("Content-Type")
  ) {
    nextHeaders.set("Content-Type", "application/json");
  }

  return nextHeaders;
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const rawText = await response.text();
  if (!rawText.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
};

const extractErrorMessage = (
  body: unknown,
  fallbackError: string,
  response?: Response,
): string => {
  if (body && typeof body === "object") {
    const apiError =
      "error" in body && typeof body.error === "string" ? body.error : "";
    const apiMessage =
      "message" in body && typeof body.message === "string"
        ? body.message
        : "";

    if (apiError.trim()) {
      return apiError.trim();
    }

    if (apiMessage.trim()) {
      return apiMessage.trim();
    }
  }

  if (typeof body === "string" && body.trim()) {
    return body.trim();
  }

  if (fallbackError.trim()) {
    return fallbackError;
  }

  if (response) {
    return `${response.status} ${response.statusText}`;
  }

  return "Request failed.";
};

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

const isNetworkError = (error: unknown): boolean =>
  error instanceof TypeError ||
  (error instanceof Error && error.message.trim() === "Failed to fetch");

export const requestJson = async <T,>(
  url: string,
  init?: RequestInit,
  config: JsonRequestConfig = {},
): Promise<T> => {
  const {
    fallbackError = "Request failed.",
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRY_COUNT,
    includeAuth = true,
    jsonContentType = false,
  } = config;
  const resolvedUrl = resolveApiUrl(url);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const externalSignal = init?.signal;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const abortHandler = () => controller.abort();

    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeout);
        throw new ApiRequestError(fallbackError);
      }
      externalSignal.addEventListener("abort", abortHandler, { once: true });
    }

    try {
      const response = await fetch(resolvedUrl, {
        ...init,
        headers: buildHeaders(
          init?.headers,
          includeAuth,
          jsonContentType,
          init?.body,
        ),
        signal: controller.signal,
      });

      const body = await parseResponseBody(response);
      if (response.ok) {
        return (body ?? {}) as T;
      }

      const error = new ApiRequestError(
        extractErrorMessage(body, fallbackError, response),
        {
          status: response.status,
          body,
          isTransient: RETRIABLE_STATUS_CODES.has(response.status),
        },
      );

      if (error.isTransient && attempt < retries) {
        await sleep(300 * (attempt + 1));
        continue;
      }

      throw error;
    } catch (error) {
      if (error instanceof ApiRequestError) {
        throw error;
      }

      if (timedOut && attempt < retries) {
        await sleep(300 * (attempt + 1));
        continue;
      }

      if ((timedOut || isNetworkError(error)) && attempt < retries) {
        await sleep(300 * (attempt + 1));
        continue;
      }

      if (timedOut) {
        throw new ApiRequestError(
          "The server took too long to respond. Please try again.",
          {
            isNetworkError: true,
            isTimeout: true,
            isTransient: true,
          },
        );
      }

      if (isAbortError(error) && externalSignal?.aborted) {
        throw new ApiRequestError(fallbackError);
      }

      if (isNetworkError(error) || isAbortError(error)) {
        throw new ApiRequestError(
          "Unable to reach the server right now. Please try again.",
          {
            isNetworkError: true,
            isTransient: true,
          },
        );
      }

      throw error instanceof Error
        ? error
        : new ApiRequestError(fallbackError);
    } finally {
      clearTimeout(timeout);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", abortHandler);
      }
    }
  }

  throw new ApiRequestError(fallbackError);
};
