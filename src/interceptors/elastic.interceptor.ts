import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ElasticSearchService } from '../infraestructure/elastic/elastic.service';

/**
 * Interceptor that automatically indexes entities to Elasticsearch
 *
 * This interceptor monitors API write operations (POST, PUT, PATCH) and
 * sends the resulting entities to Elasticsearch for indexing. It works
 * automatically without requiring explicit indexing code in controllers.
 */
@Injectable()
export class ElasticsearchInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ElasticsearchInterceptor.name);

  constructor(private readonly elasticsearchService: ElasticSearchService) {}

  /**
   * Intercepts HTTP requests to handle Elasticsearch indexing
   *
   * This method:
   * 1. Identifies if the request is a write operation (POST, PUT, PATCH)
   * 2. For write operations, captures the response data
   * 3. If the data meets indexing criteria, sends it to Elasticsearch
   * 4. Handles indexing errors without affecting the API response
   *
   * @param context - Current execution context (HTTP request/response)
   * @param next - Handler for continuing the request processing
   * @returns Observable with the original response data (unmodified)
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Get information about the current request
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const isWriteOperation = ['POST', 'PUT', 'PATCH'].includes(method);

    // For write operations, we'll update Elasticsearch
    return next.handle().pipe(
      tap((data) => {
        if (isWriteOperation && data && data.id) {
          // Identify if this is an entity that should be indexed (e.g., Product)
          if (this.shouldIndex(data)) {
            this.logger.debug(
              `Indexing ${data.constructor?.name || 'document'} with ID ${data.id}`,
            );

            this.elasticsearchService.indexDocument(data).catch((error) => {
              this.logger.error(
                `Failed to index document: ${error.message}`,
                error.stack,
              );
              // Don't throw the error to avoid affecting the API response
              // This makes Elasticsearch indexing non-blocking for the API
            });
          }
        }
      }),
    );
  }

  /**
   * Determines if an entity should be indexed in Elasticsearch
   *
   * This method checks if the data has properties that indicate
   * it should be indexed. This implementation looks for typical
   * product properties (name and price).
   *
   * In a production environment, this should be enhanced to:
   * - Use entity types/interfaces for type checking
   * - Support multiple entity types with different criteria
   * - Consider using decorators to mark entities for indexing
   *
   * @param data - The entity returned by the operation
   * @returns Boolean indicating if the entity should be indexed
   */
  private shouldIndex(data: any): boolean {
    // Check if the entity is of a type that should be indexed
    // For example, check the constructor, the presence of certain properties, etc.

    // Simple example: check if it has typical Product properties
    return !!(data.name && data.price !== undefined);
  }
}
