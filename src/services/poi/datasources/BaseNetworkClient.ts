/**
 * GUIDY - Base Network Client
 * Common network functionality for datasources
 * 
 * STAGE 4.1: POI Datasource Layer
 * 
 * Features:
 * - AbortController for request cancellation
 * - Configurable timeouts
 * - Retry logic
 * - Error handling
 * - Request/response logging
 */

import { POIErrorCode } from '../POITypes';

export interface NetworkConfig {
  baseUrl: string;
  timeout: number; // milliseconds
  retries: number;
  retryDelay: number; // milliseconds
  headers: Record<string, string>;
}

export interface NetworkResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface NetworkError {
  code: POIErrorCode;
  message: string;
  status?: number;
  retryable: boolean;
}

/**
 * Default network configuration
 */
export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  baseUrl: '',
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'User-Agent': 'GUIDY/1.0',
    'Accept': 'application/json',
  },
};

/**
 * Base Network Client
 * Provides common network functionality for all datasources
 */
export class BaseNetworkClient {
  protected config: NetworkConfig;
  private abortController: AbortController | null = null;
  private activeRequests: Set<AbortController> = new Set();

  constructor(config: Partial<NetworkConfig> = {}) {
    this.config = { ...DEFAULT_NETWORK_CONFIG, ...config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NetworkConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create new AbortController and track it
   */
  private createAbortController(): AbortController {
    const controller = new AbortController();
    this.activeRequests.add(controller);
    
    controller.signal.addEventListener('abort', () => {
      this.activeRequests.delete(controller);
    });
    
    return controller;
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    for (const controller of this.activeRequests) {
      controller.abort();
    }
    this.activeRequests.clear();
    this.abortController?.abort();
  }

  /**
   * Check if requests are cancelled
   */
  isAborted(signal: AbortSignal): boolean {
    return signal.aborted;
  }

  /**
   * Build full URL from path
   */
  protected buildUrl(path: string, queryParams?: Record<string, string | number | undefined>): string {
    const url = new URL(path, this.config.baseUrl);
    
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      }
    }
    
    return url.toString();
  }

  /**
   * Build headers with custom headers
   */
  protected buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    return {
      ...this.config.headers,
      ...customHeaders,
    };
  }

  /**
   * Execute request with retry logic
   */
  async request<T>(
    url: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<NetworkResponse<T>> {
    const controller = this.createAbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: this.buildHeaders(options.headers as Record<string, string>),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw this.createNetworkError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();

      return {
        data: data as T,
        status: response.status,
        headers: this.parseHeaders(response.headers),
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createNetworkError('Request cancelled', undefined, false);
      }

      // Check if should retry
      if (retryCount < this.config.retries && this.isRetryable(error)) {
        await this.delay(this.config.retryDelay * (retryCount + 1));
        return this.request<T>(url, options, retryCount + 1);
      }

      throw this.handleError(error);
    } finally {
      this.activeRequests.delete(controller);
    }
  }

  /**
   * GET request
   */
  async get<T>(
    path: string,
    queryParams?: Record<string, string | number | undefined>,
    options: RequestInit = {}
  ): Promise<NetworkResponse<T>> {
    const url = this.buildUrl(path, queryParams);
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(
    path: string,
    body: unknown,
    options: RequestInit = {}
  ): Promise<NetworkResponse<T>> {
    const url = this.buildUrl(path);
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
      },
    });
  }

  /**
   * Check if error is retryable
   */
  protected isRetryable(error: unknown): boolean {
    if (error instanceof TypeError) {
      // Network error
      return true;
    }
    
    if (error instanceof Error && 'status' in error) {
      const status = (error as { status: number }).status;
      // Retry on 5xx errors and 429 (rate limit)
      return status >= 500 || status === 429;
    }
    
    return false;
  }

  /**
   * Handle error and convert to NetworkError
   */
  protected handleError(error: unknown): NetworkError {
    if (error instanceof NetworkError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return this.createNetworkError('Request timed out', undefined, false);
      }
      return this.createNetworkError(error.message);
    }

    return this.createNetworkError('Unknown network error');
  }

  /**
   * Create NetworkError
   */
  protected createNetworkError(
    message: string,
    status?: number,
    retryable: boolean = true
  ): NetworkError {
    let code = POIErrorCode.UNKNOWN;

    if (status === 401 || status === 403) {
      code = POIErrorCode.PERMISSION_DENIED;
    } else if (status === 429) {
      code = POIErrorCode.RATE_LIMITED;
    } else if (status === 0 || message.includes('Network')) {
      code = POIErrorCode.NETWORK_ERROR;
    }

    return new NetworkError(message, code, status, retryable);
  }

  /**
   * Parse headers from Response
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check - verify network connectivity
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    
    try {
      await this.get(`${this.config.baseUrl}/status`, {}, { timeout: 5000 } as RequestInit);
      return {
        healthy: true,
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.cancelAllRequests();
  }
}

/**
 * Network Error class for type checking
 */
export class NetworkError extends Error {
  code: POIErrorCode;
  status?: number;
  retryable: boolean;

  constructor(
    message: string,
    code: POIErrorCode = POIErrorCode.UNKNOWN,
    status?: number,
    retryable: boolean = true
  ) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

/**
 * Create NetworkError instance
 */
export function createNetworkError(
  message: string,
  code: POIErrorCode = POIErrorCode.UNKNOWN,
  status?: number,
  retryable: boolean = true
): NetworkError {
  return new NetworkError(message, code, status, retryable);
}
