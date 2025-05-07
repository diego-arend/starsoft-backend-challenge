import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Creates a mock event emitter for testing event handling
 *
 * @returns Mock EventEmitter2 instance
 */
export function createMockEventEmitter() {
  return {
    emit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  } as unknown as EventEmitter2;
}
