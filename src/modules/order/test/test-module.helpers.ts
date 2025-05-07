import { Test } from '@nestjs/testing';
import { LoggerService } from '../../../logger/logger.service';
import { createMockLoggerService } from './test.providers';

/**
 * Configures a standard test module builder with common dependencies
 *
 * @param providers Array of providers to add to the module
 * @returns Configured TestingModule builder
 */
export function configureTestModule(providers: any[]) {
  return Test.createTestingModule({
    providers: [
      ...providers,
      {
        provide: LoggerService,
        useValue: createMockLoggerService(),
      },
    ],
  });
}

/**
 * Shared assertions for testing error handling in services
 *
 * @param throwingFn Function that should throw an error
 * @param expectedError Expected error class
 * @param loggerService Logger service mock to check for error logging
 */
export async function testErrorHandling(
  throwingFn: () => Promise<any>,
  expectedError: any,
  loggerService: LoggerService,
) {
  await expect(throwingFn()).rejects.toThrow(expectedError);
  expect(loggerService.error).toHaveBeenCalled();
}
