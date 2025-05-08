import { HttpStatus } from '@nestjs/common';
import {
  ElasticsearchConnectionException,
  ElasticsearchSearchException,
  ElasticsearchIndexingException,
  ElasticsearchUpdateException,
  ElasticsearchDeletionException,
} from './elasticsearch-exceptions';

describe('Elasticsearch Exceptions', () => {
  describe('ElasticsearchConnectionException', () => {
    it('should create a connection exception with the correct properties', () => {
      const details = { reason: 'Connection refused', port: 9200 };

      const exception = new ElasticsearchConnectionException(details);

      expect(exception.message).toBe('Failed to connect to Elasticsearch');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'CONNECTION_FAILED',
      );
      expect(exception.details).toEqual(details);
    });

    it('should provide a stack trace', () => {
      const exception = new ElasticsearchConnectionException({});
      expect(exception.stack).toBeDefined();
    });
  });

  describe('ElasticsearchSearchException', () => {
    it('should create a search exception with the correct properties', () => {
      const searchType = 'orders';
      const details = { query: { match_all: {} }, index: 'orders' };

      const exception = new ElasticsearchSearchException(searchType, details);

      expect(exception.message).toBe(
        'Failed to search for orders in Elasticsearch',
      );
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'SEARCH_FAILED',
      );
      expect(exception.details).toEqual(details);
    });

    it('should include the search type in the message', () => {
      const exception = new ElasticsearchSearchException('customers', {});
      expect(exception.message).toContain('customers');
    });
  });

  describe('ElasticsearchIndexingException', () => {
    it('should create an indexing exception with the correct properties', () => {
      const orderUuid = '12345-abcde';
      const details = { reason: 'Invalid document' };

      const exception = new ElasticsearchIndexingException(orderUuid, details);

      expect(exception.message).toBe(
        'Failed to index order 12345-abcde in Elasticsearch',
      );
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'INDEXING_FAILED',
      );
      expect(exception.details).toEqual(details);
    });

    it('should include the order UUID in the message', () => {
      const uuid = 'test-uuid-123';
      const exception = new ElasticsearchIndexingException(uuid, {});
      expect(exception.message).toContain(uuid);
    });
  });

  describe('ElasticsearchUpdateException', () => {
    it('should create an update exception with the correct properties', () => {
      const orderUuid = '12345-abcde';
      const details = { reason: 'Document not found' };

      const exception = new ElasticsearchUpdateException(orderUuid, details);

      expect(exception.message).toBe(
        'Failed to update order 12345-abcde in Elasticsearch',
      );
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'UPDATE_FAILED',
      );
      expect(exception.details).toEqual(details);
    });

    it('should include the order UUID in the message', () => {
      const uuid = 'update-uuid-456';
      const exception = new ElasticsearchUpdateException(uuid, {});
      expect(exception.message).toContain(uuid);
    });
  });

  describe('ElasticsearchDeletionException', () => {
    it('should create a deletion exception with the correct properties', () => {
      const orderUuid = '12345-abcde';
      const details = { reason: 'Index not found' };

      const exception = new ElasticsearchDeletionException(orderUuid, details);

      expect(exception.message).toBe(
        'Failed to delete order 12345-abcde from Elasticsearch',
      );
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'DELETION_FAILED',
      );
      expect(exception.details).toEqual(details);
    });

    it('should include the order UUID in the message', () => {
      const uuid = 'delete-uuid-789';
      const exception = new ElasticsearchDeletionException(uuid, {});
      expect(exception.message).toContain(uuid);
    });
  });
});
