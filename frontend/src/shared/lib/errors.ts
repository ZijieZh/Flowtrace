/**
 * Industry-standard error handling system
 *
 * Following RFC 7807 Problem Details for HTTP APIs
 * and best practices from production systems (Vercel, Stripe, AWS)
 */

// ============================================================================
// Base Error Class
// ============================================================================

interface AppErrorConfig {
  code: string
  message: string
  userMessage: string
  isRetryable: boolean
  statusCode?: number
  technicalDetails?: Record<string, unknown>
}

/**
 * Base application error class
 * All custom errors extend this
 */
class AppError extends Error {
  readonly code: string
  readonly userMessage: string
  readonly isRetryable: boolean
  readonly statusCode?: number
  readonly technicalDetails?: Record<string, unknown>

  constructor(config: AppErrorConfig) {
    super(config.message)
    this.name = this.constructor.name
    this.code = config.code
    this.userMessage = config.userMessage
    this.isRetryable = config.isRetryable
    this.statusCode = config.statusCode
    this.technicalDetails = config.technicalDetails

    // Maintains proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

// ============================================================================
// Network Errors (Client-Side Connectivity Issues)
// ============================================================================

/**
 * Network error - cannot connect to backend
 *
 * Causes: Backend not running, DNS failure, firewall, no internet
 * Retry Strategy: Exponential backoff (5 attempts)
 */
export class NetworkError extends AppError {
  readonly retryStrategy = 'exponential' as const
  readonly maxRetries = 5

  constructor(config: Omit<AppErrorConfig, 'isRetryable'>) {
    super({
      ...config,
      isRetryable: true, // Always retry network errors
    })
  }

  /**
   * Create NetworkError from fetch TypeError
   */
  static fromFetchError(endpoint: string, originalError: Error): NetworkError {
    const isDevelopment = process.env.NODE_ENV === 'development'

    return new NetworkError({
      code: 'NETWORK_ERROR',
      message: `Network request failed: ${originalError.message}`,
      userMessage: isDevelopment
        ? 'Cannot connect to backend server. Please ensure the backend is running on http://localhost:3000'
        : 'Cannot connect to server. Please check your internet connection and try again.',
      technicalDetails: isDevelopment
        ? {
            endpoint,
            error: originalError.message,
          }
        : undefined,
    })
  }

  /**
   * Create NetworkError from timeout
   */
  static fromTimeout(endpoint: string, timeoutMs: number): NetworkError {
    const isDevelopment = process.env.NODE_ENV === 'development'

    return new NetworkError({
      code: 'TIMEOUT',
      message: `Request timeout after ${timeoutMs / 1000}s`,
      userMessage: 'Request took too long. Please check your connection and try again.',
      technicalDetails: isDevelopment
        ? {
            endpoint,
            timeout: `${timeoutMs / 1000}s`,
          }
        : undefined,
    })
  }
}

// ============================================================================
// HTTP Errors (Server Returned Error Status)
// ============================================================================

interface HTTPErrorConfig {
  statusCode: number
  endpoint: string
  responseBody?: unknown
}

/**
 * HTTP error - server returned error status code
 *
 * Retry Strategy:
 * - 4xx (client errors): No retry - permanent errors
 * - 5xx (server errors): Retry 3 times - server might recover
 */
export class HTTPError extends AppError {
  readonly maxRetries: number

  constructor(config: AppErrorConfig) {
    super(config)

    // 5xx errors are retryable (server might recover)
    // 4xx errors are not retryable (client error - permanent)
    this.maxRetries = this.isRetryable ? 3 : 0
  }

  /**
   * Create HTTPError from fetch Response
   */
  static async fromResponse(response: Response, endpoint: string): Promise<HTTPError> {
    const status = response.status
    const config = HTTPError.getErrorConfig(status)
    const isDevelopment = process.env.NODE_ENV === 'development'

    // Try to extract error details from response body
    let responseBody: unknown
    try {
      responseBody = await response.json()
    } catch {
      // Response body is not JSON - ignore
    }
    let serverMessage =
      typeof (responseBody as any)?.error === 'string' ? (responseBody as any).error :
      typeof (responseBody as any)?.message === 'string' ? (responseBody as any).message :
      typeof (responseBody as any)?.detail === 'string' ? (responseBody as any).detail :
      ''
    try {
      serverMessage = JSON.parse(serverMessage)?.error || serverMessage
    } catch {}

    return new HTTPError({
      ...config,
      message: serverMessage || config.message,
      userMessage: serverMessage || config.userMessage,
      statusCode: status,
      technicalDetails: isDevelopment
        ? {
            status,
            statusText: response.statusText,
            ...(responseBody ? { response: JSON.stringify(responseBody).slice(0, 200) } : {}),
          }
        : undefined,
    })
  }

  /**
   * Map HTTP status codes to error configurations
   * Following industry-standard error messages
   */
  private static getErrorConfig(status: number): Omit<AppErrorConfig, 'statusCode' | 'technicalDetails'> {
    // 4xx Client Errors (permanent - no retry)
    if (status === 400) {
      return {
        code: 'BAD_REQUEST',
        message: 'Bad Request',
        userMessage: 'Invalid request. Please check your input and try again.',
        isRetryable: false,
      }
    }

    if (status === 401) {
      return {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
        userMessage: 'Your session has expired. Please log in again.',
        isRetryable: false,
      }
    }

    if (status === 403) {
      return {
        code: 'FORBIDDEN',
        message: 'Forbidden',
        userMessage: "You don't have permission to access this resource.",
        isRetryable: false,
      }
    }

    if (status === 404) {
      return {
        code: 'NOT_FOUND',
        message: 'Not Found',
        userMessage: 'The requested resource was not found. It may have been deleted.',
        isRetryable: false,
      }
    }

    if (status === 409) {
      return {
        code: 'CONFLICT',
        message: 'Conflict',
        userMessage: 'This action conflicts with existing data. Please check and try again.',
        isRetryable: false,
      }
    }

    if (status === 422) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Validation Error',
        userMessage: 'Validation failed. Please check your input.',
        isRetryable: false,
      }
    }

    if (status === 429) {
      return {
        code: 'RATE_LIMITED',
        message: 'Too Many Requests',
        userMessage: 'Too many requests. Please wait a moment and try again.',
        isRetryable: true, // Can retry after waiting
      }
    }

    // 5xx Server Errors (temporary - retry)
    if (status === 500) {
      return {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal Server Error',
        userMessage: 'Server error. Please try again.',
        isRetryable: true,
      }
    }

    if (status === 502) {
      return {
        code: 'BAD_GATEWAY',
        message: 'Bad Gateway',
        userMessage: 'Service temporarily unavailable. Please try again.',
        isRetryable: true,
      }
    }

    if (status === 503) {
      return {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service Unavailable',
        userMessage: 'Service temporarily unavailable. Please try again.',
        isRetryable: true,
      }
    }

    if (status === 504) {
      return {
        code: 'GATEWAY_TIMEOUT',
        message: 'Gateway Timeout',
        userMessage: 'Request timeout. Please try again.',
        isRetryable: true,
      }
    }

    // Unknown status code
    return {
      code: 'UNKNOWN_HTTP_ERROR',
      message: `HTTP Error ${status}`,
      userMessage: `An error occurred (${status}). Please try again.`,
      isRetryable: status >= 500, // Retry server errors, not client errors
    }
  }
}

// ============================================================================
// Retry Delay Calculator
// ============================================================================

/**
 * Calculate retry delay using exponential backoff
 *
 * @param attemptIndex - Zero-based attempt index (0 = first retry)
 * @returns Delay in milliseconds
 *
 * @example
 * calculateRetryDelay(0) // 1000ms (1s)
 * calculateRetryDelay(1) // 2000ms (2s)
 * calculateRetryDelay(2) // 4000ms (4s)
 * calculateRetryDelay(3) // 8000ms (8s)
 * calculateRetryDelay(4) // 16000ms (16s)
 * calculateRetryDelay(5) // 30000ms (30s - capped)
 */
export function calculateRetryDelay(attemptIndex: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s...
  // Capped at 30 seconds to avoid excessive delays
  return Math.min(1000 * 2 ** attemptIndex, 30000)
}
