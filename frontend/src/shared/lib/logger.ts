/**
 * Structured logging utility.
 *
 * Core Principle: NO SILENT FALLBACKS. NO SILENT FAILURES.
 * - Every log must include context (file, function, relevant data)
 * - Use appropriate log levels (error, warn, info, debug)
 * - Include actionable information for debugging
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export interface LogContext {
  file?: string
  function?: string
  component?: string
  action?: string
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  /**
   * Format log message with context
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const levelTag = `[${level.toUpperCase()}]`

    // Build location string
    const location = this.buildLocation(context)

    // Build context string
    const contextStr = this.buildContextString(context)

    return `${levelTag} ${location} ${message}${contextStr}`
  }

  /**
   * Build location string from context
   */
  private buildLocation(context?: LogContext): string {
    if (!context) return ''

    const parts: string[] = []
    if (context.file) parts.push(context.file)
    if (context.function) parts.push(context.function)

    return parts.length > 0 ? `[${parts.join(':')}]` : ''
  }

  /**
   * Build context string from data
   */
  private buildContextString(context?: LogContext): string {
    if (!context) return ''

    // Filter out location fields
    const { file, function: fn, component, action, ...data } = context

    const dataParts: string[] = []

    // Add component/action if present
    if (component) dataParts.push(`component=${component}`)
    if (action) dataParts.push(`action=${action}`)

    // Add remaining data
    Object.entries(data).forEach(([key, value]) => {
      try {
        const serialized = typeof value === 'object'
          ? JSON.stringify(value)
          : String(value)
        dataParts.push(`${key}=${serialized}`)
      } catch (e) {
        dataParts.push(`${key}=[unserializable]`)
      }
    })

    return dataParts.length > 0 ? ` | ${dataParts.join(' | ')}` : ''
  }

  /**
   * Log error - for failures that impact functionality
   * Use when: API calls fail, validation fails, unexpected states
   */
  error(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('error', message, context)
    console.error(formatted)
  }

  /**
   * Log warning - for recoverable issues or unexpected but handled situations
   * Use when: Fallbacks are used, deprecated features, validation warnings
   */
  warn(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('warn', message, context)
    console.warn(formatted)
  }

  /**
   * Log info - for important events and state changes
   * Use when: User actions, successful operations, state transitions
   */
  info(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('info', message, context)
    console.info(formatted)
  }

  /**
   * Log debug - for detailed diagnostic information
   * Use when: Tracing execution flow, inspecting data
   */
  debug(message: string, context?: LogContext): void {
    // Only log debug in development
    if (!this.isDevelopment) return

    const formatted = this.formatMessage('debug', message, context)
    console.log(formatted)
  }
}

// Export singleton instance
export const logger = new Logger()

/**
 * Helper to create a logger with preset context
 * Useful for component-specific logging
 *
 * Example:
 * const log = createLogger({ file: 'tools.api.ts', function: 'useTools' })
 * log.error('Failed to fetch tools', { endpoint: '/v1/tools' })
 */
export function createLogger(baseContext: LogContext) {
  return {
    error: (message: string, context?: LogContext) =>
      logger.error(message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      logger.info(message, { ...baseContext, ...context }),
    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { ...baseContext, ...context }),
  }
}
