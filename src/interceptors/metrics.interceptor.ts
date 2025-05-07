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
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly requestCounter: Counter<string>,

    @InjectMetric('http_request_duration_seconds')
    private readonly requestDuration: Histogram<string>,
  ) {}

  /**
   * Intercepts HTTP requests to collect metrics
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
        this.requestCounter.inc({ method, path, statusCode });

        // Re-throw the error to maintain normal error handling flow
        throw err;
      }),
    );
  }
}
