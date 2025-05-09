import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

/**
 * Base exception for Elasticsearch errors
 */
export class ElasticsearchException extends BaseException {
  constructor(message: string, errorCode: string, details?: any) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, errorCode, details);
  }
}

/**
 * Exception thrown when a resource is not found in Elasticsearch
 */
export class ElasticsearchNotFoundException extends BaseException {
  constructor(resourceId: string, resourceType: string = 'Resource') {
    super(
      `${resourceType} with id '${resourceId}' not found`,
      HttpStatus.NOT_FOUND,
      'RESOURCE_NOT_FOUND',
      { resourceId, resourceType },
    );
  }
}

/**
 * Exception thrown when there's an error searching in Elasticsearch
 */
export class ElasticsearchSearchException extends ElasticsearchException {
  constructor(message: string, details?: any) {
    super(message, 'ELASTICSEARCH_SEARCH_ERROR', details);
  }
}

/**
 * Exception thrown when a document indexing operation fails in Elasticsearch
 * Represents a system error that prevented the document from being indexed
 */
export class ElasticsearchIndexException extends ElasticsearchException {
  /**
   * Creates a new Elasticsearch indexing exception
   *
   * @param message - Error description message
   * @param details - Optional additional error details like document data
   */
  constructor(message: string, details?: any) {
    super(message, 'INDEX_OPERATION_FAILED', details);
  }
}
