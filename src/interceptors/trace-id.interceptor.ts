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
 */
@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  /**
   * Intercepts HTTP requests to add trace ID to responses
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
          response.setHeader('X-Trace-ID', traceId);
        }
      }),
    );
  }
}
