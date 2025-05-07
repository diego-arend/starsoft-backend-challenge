import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';

/**
 * Application Prometheus metrics providers
 */
export const metricsProviders = [
  /**
   * HTTP Requests Counter
   * Tracks total HTTP requests with labels for method, path, and status code
   */
  makeCounterProvider({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'statusCode'],
  }),

  /**
   * HTTP Request Duration Histogram
   * Measures request duration in seconds with buckets optimized for API response times
   */
  makeHistogramProvider({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'path', 'statusCode'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], // 10ms to 5s range
  }),

  /**
   * Application Events Counter
   * Tracks business events by type and outcome
   */
  makeCounterProvider({
    name: 'app_events_total',
    help: 'Total number of application events',
    labelNames: ['event', 'status'],
  }),

  /**
   * Application Errors Counter
   * Tracks errors by source and type
   */
  makeCounterProvider({
    name: 'app_errors_total',
    help: 'Total number of application errors',
    labelNames: ['source', 'errorType'],
  }),
];
