import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { context, trace } from '@opentelemetry/api';

/**
 * Interceptor that adds trace IDs to HTTP responses
 *
 * This interceptor enhances the application's observability by:
 * 1. Extracting the trace ID from the current OpenTelemetry context
 * 2. Adding the trace ID to the HTTP response headers
 *
 * This allows trace correlation between the client and server,
 * making it easier to track requests across the system and
 * troubleshoot issues by connecting logs, metrics, and traces.
 */
@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  /**
   * Intercepts HTTP requests to add trace ID to responses
   *
   * This method:
   * 1. Processes the request normally through the handler
   * 2. Extracts the OpenTelemetry trace ID from the active context
   * 3. Adds the trace ID to the response headers as 'X-Trace-ID'
   *
   * @param ctx - Execution context containing request and response
   * @param next - Call handler to continue request processing
   * @returns Observable that completes when the request is finished
   */
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        const response = ctx.switchToHttp().getResponse();

        // Get the current span and its trace ID from OpenTelemetry
        const currentSpan = trace.getSpan(context.active());
        if (currentSpan) {
          const spanContext = currentSpan.spanContext();
          const traceId = spanContext.traceId;

          // Add the trace ID to the response header
          // This makes the trace ID visible to the client for correlation
          response.setHeader('X-Trace-ID', traceId);
        }
      }),
    );
  }
}
