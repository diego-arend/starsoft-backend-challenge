import { HttpStatus } from '@nestjs/common';
import {
  EntityNotFoundException,
  EntityNotModifiableException,
  DatabaseTransactionFailedException,
  EntityCreationFailedException,
  EntityUpdateFailedException,
  EntityValidationException,
} from './database-exceptions';

describe('Database Exceptions', () => {
  describe('EntityNotFoundException', () => {
    it('should format message correctly with string identifier', () => {
      const entityName = 'User';
      const identifier = 'abc-123-456';

      const exception = new EntityNotFoundException(entityName, identifier);

      expect(exception.message).toBe(`User with UUID abc-123-456 not found`);
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);

      const response = exception.getResponse();
      expect(response).toHaveProperty(
        'message',
        `User with UUID abc-123-456 not found`,
      );
      expect(response).toHaveProperty('statusCode', HttpStatus.NOT_FOUND);
    });

    it('should format message correctly with numeric identifier', () => {
      const entityName = 'Product';
      const identifier = 42;

      const exception = new EntityNotFoundException(entityName, identifier);

      expect(exception.message).toBe(`Product with ID 42 not found`);
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('EntityNotModifiableException', () => {
    it('should include reason in the message', () => {
      const entityName = 'Order';
      const identifier = 'order-123';
      const reason = 'already completed';

      const exception = new EntityNotModifiableException(
        entityName,
        identifier,
        reason,
      );

      expect(exception.message).toBe(
        `Order order-123 cannot be modified: already completed`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);

      const response = exception.getResponse();
      expect(response).toHaveProperty(
        'message',
        `Order order-123 cannot be modified: already completed`,
      );
      expect(response).toHaveProperty('statusCode', HttpStatus.BAD_REQUEST);
    });

    it('should work with numeric identifiers', () => {
      const entityName = 'Invoice';
      const identifier = 9876;
      const reason = 'payment already processed';

      const exception = new EntityNotModifiableException(
        entityName,
        identifier,
        reason,
      );

      expect(exception.message).toBe(
        `Invoice 9876 cannot be modified: payment already processed`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DatabaseTransactionFailedException', () => {
    it('should include operation in message and store details', () => {
      const operation = 'order creation';
      const details = {
        sql: 'INSERT INTO orders...',
        error: 'Connection reset',
      };

      const exception = new DatabaseTransactionFailedException(
        operation,
        details,
      );

      expect(exception.message).toBe(
        `Database transaction failed during order creation`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      const response = exception.getResponse();
      expect(response).toHaveProperty(
        'message',
        `Database transaction failed during order creation`,
      );
      expect(response).toHaveProperty('details', details);
      expect(response).toHaveProperty(
        'statusCode',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });
  });

  describe('EntityCreationFailedException', () => {
    it('should include entity name in the message', () => {
      const entityName = 'Customer';

      const exception = new EntityCreationFailedException(entityName);

      expect(exception.message).toBe(`Failed to create Customer`);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should store optional details when provided', () => {
      const entityName = 'Product';
      const details = { name: 'Test Product', error: 'Duplicate SKU' };

      const exception = new EntityCreationFailedException(entityName, details);

      expect(exception.message).toBe(`Failed to create Product`);

      const response = exception.getResponse();
      expect(response).toHaveProperty('details', details);
    });
  });

  describe('EntityUpdateFailedException', () => {
    it('should include entity name in the message', () => {
      const entityName = 'ShippingAddress';

      const exception = new EntityUpdateFailedException(entityName);

      expect(exception.message).toBe(`Failed to update ShippingAddress`);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should store optional details when provided', () => {
      const entityName = 'Cart';
      const details = { cartId: 123, items: [1, 2, 3] };

      const exception = new EntityUpdateFailedException(entityName, details);

      expect(exception.message).toBe(`Failed to update Cart`);

      const response = exception.getResponse();
      expect(response).toHaveProperty('details', details);
    });
  });

  describe('EntityValidationException', () => {
    it('should use provided message', () => {
      const entityName = 'User';
      const message = 'Email format is invalid';

      const exception = new EntityValidationException(entityName, message);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should store optional details when provided', () => {
      const entityName = 'Product';
      const message = 'Required fields missing';
      const details = { missing: ['name', 'price'] };

      const exception = new EntityValidationException(
        entityName,
        message,
        details,
      );

      expect(exception.message).toBe(message);

      const response = exception.getResponse();
      expect(response).toHaveProperty('details', details);
    });

    it('should include both message and entity in response', () => {
      const entityName = 'Order';
      const message = 'Order total must be positive';

      const exception = new EntityValidationException(entityName, message);

      const response = exception.getResponse();
      expect(response).toHaveProperty('message', message);
      expect(response).toHaveProperty('statusCode', HttpStatus.BAD_REQUEST);
    });
  });

  describe('exception inheritance', () => {
    it('should maintain proper hierarchy for catch blocks', () => {
      const exceptions = [
        new EntityNotFoundException('User', 123),
        new EntityNotModifiableException('Order', 'abc', 'already shipped'),
        new DatabaseTransactionFailedException('save', { error: 'timeout' }),
        new EntityCreationFailedException('Product'),
        new EntityUpdateFailedException('Cart'),
        new EntityValidationException('Customer', 'Invalid data'),
      ];

      // As exceções devem ter a mensagem e status esperados
      expect(exceptions[0].message).toContain('not found');
      expect(exceptions[0].getStatus()).toBe(HttpStatus.NOT_FOUND);

      expect(exceptions[1].message).toContain('cannot be modified');
      expect(exceptions[1].getStatus()).toBe(HttpStatus.BAD_REQUEST);

      expect(exceptions[2].message).toContain('transaction failed');
      expect(exceptions[2].getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(exceptions[3].message).toContain('Failed to create');
      expect(exceptions[3].getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(exceptions[4].message).toContain('Failed to update');
      expect(exceptions[4].getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(exceptions[5].message).toBe('Invalid data');
      expect(exceptions[5].getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });
});
