import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

/**
 * Combines multiple Swagger decorators into a single decorator function
 * @param docs Configuration object for Swagger documentation
 */
export function ApiDocumentation(docs: any) {
  const decorators = [];

  // Add ApiOperation
  if (docs.operation) {
    decorators.push(ApiOperation(docs.operation));
  }

  // Add ApiBody
  if (docs.body) {
    decorators.push(ApiBody(docs.body));
  }

  // Add ApiParam(s) - supports array or single object
  if (docs.params) {
    if (Array.isArray(docs.params)) {
      docs.params.forEach((param) => {
        decorators.push(ApiParam(param));
      });
    } else {
      decorators.push(ApiParam(docs.params));
    }
  }

  // Add ApiQuery - supports array or single object
  if (docs.query) {
    if (Array.isArray(docs.query)) {
      docs.query.forEach((query) => {
        decorators.push(ApiQuery(query));
      });
    } else {
      decorators.push(ApiQuery(docs.query));
    }
  }

  // Add ApiResponse(s)
  if (docs.responses) {
    docs.responses.forEach((response) => {
      decorators.push(ApiResponse(response));
    });
  }

  return applyDecorators(...decorators);
}
