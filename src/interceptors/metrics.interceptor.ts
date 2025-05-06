import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

/**
 * Interceptor that captures and records HTTP metrics for monitoring
 *
 * This interceptor automatically tracks two key metrics for all HTTP requests:
 * 1. Total number of requests (counter) - Segmented by method, path, and status code
 * 2. Request duration (histogram) - Measures response time in seconds
 *
 * These metrics are exposed through Prometheus and can be visualized in Grafana dashboards.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    /**
     * Counter for tracking total HTTP requests
     * Labels: method, path, statusCode
     */
    @InjectMetric('http_requests_total')
    private readonly requestCounter: Counter<string>,

    /**
     * Histogram for measuring request duration
     * Labels: method, path, statusCode
     * Unit: seconds
     */
    @InjectMetric('http_request_duration_seconds')
    private readonly requestDuration: Histogram<string>,
  ) {}

  /**
   * Intercepts HTTP requests to collect metrics
   *
   * This method:
   * 1. Captures the request method and path
   * 2. Records the start time of the request
   * 3. Processes the request normally
   * 4. Records the request duration and status code on completion
   * 5. Handles errors and records them as separate metrics
   *
   * @param context - Execution context containing request details
   * @param next - Call handler to continue request processing
   * @returns Observable that completes when the request is finished
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Extract request information
    const request = context.switchToHttp().getRequest();
    const { method, path } = request;

    // Record start time for duration calculation
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        // Calculate request duration in seconds
        const duration = (Date.now() - start) / 1000;

        // Get HTTP status code from response
        const statusCode = context.switchToHttp().getResponse().statusCode;

        // Increment the HTTP requests counter with labels
        this.requestCounter.inc({ method, path, statusCode });

        // Record the request duration in the histogram
        this.requestDuration.observe({ method, path, statusCode }, duration);
      }),
      catchError((err) => {
        // For errors, get status code from the error or default to 500
        const statusCode = err.status || 500;

        // Increment counter for error requests
        // This ensures failed requests are also counted in metrics
        this.requestCounter.inc({ method, path, statusCode });

        // Re-throw the error to maintain normal error handling flow
        throw err;
      }),
    );
  }
}
