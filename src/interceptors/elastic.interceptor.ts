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
 */
@Injectable()
export class ElasticsearchInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ElasticsearchInterceptor.name);

  constructor(private readonly elasticsearchService: ElasticSearchService) {}

  /**
   * Intercepts HTTP requests to handle Elasticsearch indexing
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
          // Identify if this is an entity that should be indexed
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
            });
          }
        }
      }),
    );
  }

  /**
   * Determines if an entity should be indexed in Elasticsearch
   */
  private shouldIndex(data: any): boolean {
    // Simple check: verify if it has typical Product properties
    return !!(data.name && data.price !== undefined);
  }
}
