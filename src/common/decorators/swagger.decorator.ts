import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

export function ApiDocumentation(docs: any) {
  const decorators = [];

  // Adiciona ApiOperation
  if (docs.operation) {
    decorators.push(ApiOperation(docs.operation));
  }

  // Adiciona ApiBody
  if (docs.body) {
    decorators.push(ApiBody(docs.body));
  }

  // Adiciona ApiParam(s)
  if (docs.params) {
    if (Array.isArray(docs.params)) {
      docs.params.forEach((param) => {
        decorators.push(ApiParam(param));
      });
    } else {
      decorators.push(ApiParam(docs.params));
    }
  }

  // Adiciona ApiQuery - suporta array ou objeto único
  if (docs.query) {
    if (Array.isArray(docs.query)) {
      docs.query.forEach((query) => {
        decorators.push(ApiQuery(query));
      });
    } else {
      decorators.push(ApiQuery(docs.query));
    }
  }

  // Adiciona ApiResponse(s)
  if (docs.responses) {
    docs.responses.forEach((response) => {
      decorators.push(ApiResponse(response));
    });
  }

  return applyDecorators(...decorators);
}
