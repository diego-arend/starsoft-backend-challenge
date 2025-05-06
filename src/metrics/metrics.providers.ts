import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';

/**
 * Application Prometheus metrics providers
 *
 * This array defines all the Prometheus metrics used throughout the application.
 * Each provider creates a metric that can be injected into services and controllers
 * using the @InjectMetric decorator from @willsoto/nestjs-prometheus.
 */
export const metricsProviders = [
  /**
   * HTTP Requests Counter
   *
   * Tracks the total number of HTTP requests processed by the application.
   * Labels allow segmentation by:
   * - method: HTTP method (GET, POST, etc.)
   * - path: Request URL path
   * - statusCode: HTTP response status code
   *
   * Example Prometheus query: http_requests_total{method="GET",path="/health"}
   */
  makeCounterProvider({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'statusCode'],
  }),

  /**
   * HTTP Request Duration Histogram
   *
   * Measures the duration of HTTP requests in seconds.
   * Histogram buckets are optimized for typical web API response times
   * from 10ms to 5s, allowing percentile calculations.
   *
   * Labels match the HTTP requests counter for correlation.
   *
   * Example Prometheus query for 95th percentile:
   * histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path))
   */
  makeHistogramProvider({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'path', 'statusCode'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], // 10ms to 5s range
  }),

  /**
   * Application Events Counter
   *
   * Tracks business and operational events within the application.
   * Labels allow segmentation by:
   * - event: Type of event (e.g., 'order_created', 'payment_processed')
   * - status: Outcome of the event ('success', 'failure', 'warning')
   *
   * Used by LoggerService to correlate logs with metrics.
   *
   * Example Prometheus query: sum(app_events_total{status="failure"}) by (event)
   */
  makeCounterProvider({
    name: 'app_events_total',
    help: 'Total number of application events',
    labelNames: ['event', 'status'],
  }),

  /**
   * Application Errors Counter
   *
   * Tracks errors that occur within the application.
   * Labels allow segmentation by:
   * - source: Component where the error occurred (e.g., 'database', 'elasticsearch')
   * - errorType: Classification of the error (e.g., 'connection', 'timeout', 'validation')
   *
   * Used by LoggerService to provide error metrics for alerting.
   *
   * Example Prometheus query: sum(rate(app_errors_total[5m])) by (source)
   */
  makeCounterProvider({
    name: 'app_errors_total',
    help: 'Total number of application errors',
    labelNames: ['source', 'errorType'],
  }),
];
