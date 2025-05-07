import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../../../common/exceptions/base.exception';

/**
 * Exception thrown when the connection to Elasticsearch fails
 */
export class ElasticsearchConnectionException extends BaseException {
  /**
   * Creates a new ElasticsearchConnectionException
   *
   * @param details Additional error details
   */
  constructor(details: any) {
    super(
      'Failed to connect to Elasticsearch',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'CONNECTION_FAILED',
      details,
    );
  }
}

/**
 * Exception thrown when search operations in Elasticsearch fail
 */
export class ElasticsearchSearchException extends BaseException {
  /**
   * Creates a new ElasticsearchSearchException
   *
   * @param searchType Type of search that failed
   * @param details Additional error details
   */
  constructor(searchType: string, details: any) {
    super(
      `Failed to search for ${searchType} in Elasticsearch`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'SEARCH_FAILED',
      details,
    );
  }
}

/**
 * Exception thrown when indexing operations in Elasticsearch fail
 */
export class ElasticsearchIndexingException extends BaseException {
  /**
   * Creates a new ElasticsearchIndexingException
   *
   * @param orderUuid UUID of the order that failed to be indexed
   * @param details Additional error details
   */
  constructor(orderUuid: string, details: any) {
    super(
      `Failed to index order ${orderUuid} in Elasticsearch`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INDEXING_FAILED',
      details,
    );
  }
}

/**
 * Exception thrown when update operations in Elasticsearch fail
 */
export class ElasticsearchUpdateException extends BaseException {
  /**
   * Creates a new ElasticsearchUpdateException
   *
   * @param orderUuid UUID of the order that failed to be updated
   * @param details Additional error details
   */
  constructor(orderUuid: string, details: any) {
    super(
      `Failed to update order ${orderUuid} in Elasticsearch`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'UPDATE_FAILED',
      details,
    );
  }
}

/**
 * Exception thrown when deletion operations in Elasticsearch fail
 */
export class ElasticsearchDeletionException extends BaseException {
  /**
   * Creates a new ElasticsearchDeletionException
   *
   * @param orderUuid UUID of the order that failed to be deleted
   * @param details Additional error details
   */
  constructor(orderUuid: string, details: any) {
    super(
      `Failed to delete order ${orderUuid} from Elasticsearch`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'DELETION_FAILED',
      details,
    );
  }
}
