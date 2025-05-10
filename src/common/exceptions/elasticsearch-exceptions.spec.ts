import { HttpStatus } from '@nestjs/common';
import {
  ElasticsearchException,
  ElasticsearchNotFoundException,
  ElasticsearchSearchException,
  ElasticsearchIndexException,
} from './elasticsearch-exceptions';

describe('Elasticsearch Exceptions', () => {
  describe('ElasticsearchException', () => {
    it('should create a base exception with correct properties', () => {
      const message = 'Connection to Elasticsearch failed';
      const errorCode = 'CONNECTION_ERROR';
      const details = { host: 'localhost', port: 9200 };

      const exception = new ElasticsearchException(message, errorCode, details);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      const response = exception.getResponse();
      expect(response).toHaveProperty('message', message);
      expect(response).toHaveProperty('errorCode', errorCode);
      expect(response).toHaveProperty('details', details);
      expect(response).toHaveProperty(
        'statusCode',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(response).toHaveProperty('timestamp');
    });

    it('should work without details', () => {
      const message = 'General Elasticsearch error';
      const errorCode = 'GENERAL_ERROR';

      const exception = new ElasticsearchException(message, errorCode);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('ElasticsearchNotFoundException', () => {
    it('should create a not found exception with default resource type', () => {
      const resourceId = '123e4567-e89b-12d3-a456-426614174000';

      const exception = new ElasticsearchNotFoundException(resourceId);

      expect(exception.message).toBe(
        `Resource with id '${resourceId}' not found`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it('should create a not found exception with custom resource type', () => {
      const resourceId = 'order-1234';
      const resourceType = 'Order';

      const exception = new ElasticsearchNotFoundException(
        resourceId,
        resourceType,
      );

      expect(exception.message).toBe(
        `${resourceType} with id '${resourceId}' not found`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('ElasticsearchSearchException', () => {
    it('should create a search exception with correct status code', () => {
      const message = 'Failed to execute search query';
      const details = { query: 'product:laptop' };

      const exception = new ElasticsearchSearchException(message, details);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should work without details', () => {
      const message = 'Search query timeout';

      const exception = new ElasticsearchSearchException(message);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('ElasticsearchIndexException', () => {
    it('should create an index exception with correct status code', () => {
      const message = 'Failed to index document';
      const details = { document: { id: 123, name: 'Test Product' } };

      const exception = new ElasticsearchIndexException(message, details);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should inherit from ElasticsearchException', () => {
      const exception = new ElasticsearchIndexException('Indexing error');

      expect(exception instanceof ElasticsearchException).toBe(true);
    });
  });

  describe('Exception inheritance', () => {
    it('should ensure ElasticsearchSearchException inherits from ElasticsearchException', () => {
      const exception = new ElasticsearchSearchException('Search error');

      expect(exception instanceof ElasticsearchException).toBe(true);
    });

    it('should allow catching derived exceptions with the base type', () => {
      const searchException = new ElasticsearchSearchException('Search error');
      const indexException = new ElasticsearchIndexException('Index error');
      const notFoundException = new ElasticsearchNotFoundException('doc-123');

      const exceptions: ElasticsearchException[] = [];
      exceptions.push(searchException);
      exceptions.push(indexException);
      exceptions.push(notFoundException);

      expect(exceptions.length).toBe(3);
      expect(exceptions[0].message).toBe('Search error');
      expect(exceptions[1].message).toBe('Index error');
      expect(exceptions[2].message).toBe(
        "Resource with id 'doc-123' not found",
      );
    });

    it('should verify response structure from ElasticsearchException', () => {
      const message = 'Test message';
      const exception = new ElasticsearchException(message, 'TEST_CODE');

      const response = exception.getResponse();
      expect(response).toHaveProperty('message', message);
      expect(response).toHaveProperty(
        'statusCode',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });
  });
});
