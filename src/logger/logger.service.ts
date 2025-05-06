import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

/**
 * Enhanced logging service with metrics integration
 *
 * This service extends basic logging capabilities by:
 * 1. Providing standard log levels (log, error, warn, debug)
 * 2. Recording metrics for application events and errors
 * 3. Supporting contextual logging with timestamps
 * 4. Integrating with Prometheus for monitoring
 */
@Injectable()
export class LoggerService {
  /**
   * Initializes the logger service with Prometheus counters
   *
   * @param eventsCounter - Prometheus counter for tracking all application events
   * @param errorsCounter - Prometheus counter for tracking application errors
   */
  constructor(
    @InjectMetric('app_events_total')
    private readonly eventsCounter: Counter<string>,
    @InjectMetric('app_errors_total')
    private readonly errorsCounter: Counter<string>,
  ) {}

  /**
   * Logs informational messages
   *
   * Records a standard log message and increments the events counter
   * with a 'success' status.
   *
   * @param message - The message to be logged
   * @param context - Optional context name (e.g., class or module name)
   */
  log(message: string, context?: string): void {
    // Record metrics for the log event
    this.eventsCounter.inc({ event: context || 'general', status: 'success' });

    // Output formatted log with timestamp and context
    console.log(
      `[${new Date().toISOString()}] [${context || 'Application'}] ${message}`,
    );
  }

  /**
   * Logs error messages with optional stack trace
   *
   * Records error information and increments the error counter
   * with context and error type classification.
   *
   * @param message - The error message
   * @param trace - Optional stack trace or error details
   * @param context - Optional source context where the error occurred
   * @param errorType - Optional classification of the error type
   */
  error(
    message: string,
    trace?: string,
    context?: string,
    errorType?: string,
  ): void {
    // Record metrics for the error
    this.errorsCounter.inc({
      source: context || 'general',
      errorType: errorType || 'unknown',
    });

    // Output formatted error log with timestamp and context
    console.error(
      `[${new Date().toISOString()}] [${context || 'Application'}] Error: ${message}`,
    );

    // Include stack trace if available
    if (trace) {
      console.error(trace);
    }
  }

  /**
   * Logs warning messages
   *
   * Records a warning message and increments the events counter
   * with a 'warning' status.
   *
   * @param message - The warning message
   * @param context - Optional context name
   */
  warn(message: string, context?: string): void {
    // Record metrics for the warning event
    this.eventsCounter.inc({ event: context || 'general', status: 'warning' });

    // Output formatted warning with timestamp and context
    console.warn(
      `[${new Date().toISOString()}] [${context || 'Application'}] Warning: ${message}`,
    );
  }

  /**
   * Logs debug information
   *
   * Records a debug message for development troubleshooting.
   * Note: Debug messages don't increment metrics counters.
   *
   * @param message - The debug information message
   * @param context - Optional context name
   */
  debug(message: string, context?: string): void {
    // Output formatted debug message with timestamp and context
    console.debug(
      `[${new Date().toISOString()}] [${context || 'Application'}] Debug: ${message}`,
    );
  }

  /**
   * Records a custom application event for metrics
   *
   * This method only updates metrics without console output.
   * Useful for tracking business events that need monitoring.
   *
   * @param event - Name of the event to record
   * @param status - Status of the event (success, failure, warning)
   */
  recordEvent(
    event: string,
    status: 'success' | 'failure' | 'warning' = 'success',
  ): void {
    this.eventsCounter.inc({ event, status });
  }

  /**
   * Records a custom error event for metrics
   *
   * This method only updates metrics without console output.
   * Useful for tracking errors that need classification and monitoring.
   *
   * @param source - The source/context where the error occurred
   * @param errorType - Classification of the error type
   */
  recordError(source: string, errorType: string): void {
    this.errorsCounter.inc({ source, errorType });
  }
}
