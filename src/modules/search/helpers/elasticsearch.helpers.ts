import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { Order } from '../../order/entities/order.entity';
import { OrderStatus } from '../../order/entities/order.entity';
import { DateRangeDto } from '../dto/search-query.dto';

/**
 * Extracts orders from Elasticsearch response
 */
export function extractOrdersFromResponse(response: any): Order[] {
  // For newer Elasticsearch versions (v7+)
  if (response.hits?.hits) {
    return response.hits.hits.map((hit) => hit._source);
  }
  // For older versions with body property
  else if (response.body?.hits?.hits) {
    return response.body.hits.hits.map((hit) => hit._source);
  }

  return [];
}

/**
 * Gets total count from Elasticsearch response
 */
export function extractTotalFromResponse(response: any): number {
  // For newer Elasticsearch versions (v7+)
  if (response.hits) {
    return typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total.value;
  }
  // For older versions with body property
  else if (response.body?.hits) {
    return typeof response.body.hits.total === 'number'
      ? response.body.hits.total
      : response.body.hits.total.value;
  }

  return 0;
}

/**
 * Creates a search request for finding by UUID
 */
export function createUuidSearchRequest(
  uuid: string,
  indexName: string,
): SearchRequest {
  return {
    index: indexName,
    query: {
      term: { uuid },
    },
  };
}

/**
 * Creates a search request for finding by status
 */
export function createStatusSearchRequest(
  status: OrderStatus,
  indexName: string,
  page: number,
  limit: number,
): SearchRequest {
  return {
    index: indexName,
    query: {
      term: { status },
    },
    sort: [{ createdAt: { order: 'desc' } }],
    from: (page - 1) * limit,
    size: limit,
  };
}

/**
 * Creates a search request for finding by date range
 */
export function createDateRangeSearchRequest(
  dateRange: DateRangeDto,
  indexName: string,
  page: number,
  limit: number,
): SearchRequest {
  const rangeQuery: any = { range: { createdAt: {} } };

  if (dateRange.from) {
    rangeQuery.range.createdAt.gte = dateRange.from;
  }

  if (dateRange.to) {
    rangeQuery.range.createdAt.lte = dateRange.to;
  }

  return {
    index: indexName,
    query: rangeQuery,
    sort: [{ createdAt: { order: 'desc' } }],
    from: (page - 1) * limit,
    size: limit,
  };
}

/**
 * Creates a search request for finding by product ID
 */
export function createProductIdSearchRequest(
  productId: string,
  indexName: string,
  page: number,
  limit: number,
): SearchRequest {
  return {
    index: indexName,
    query: {
      nested: {
        path: 'items',
        query: {
          term: { 'items.productId': productId },
        },
      },
    },
    sort: [{ createdAt: { order: 'desc' } }],
    from: (page - 1) * limit,
    size: limit,
  };
}

/**
 * Creates a search request for finding by product name
 */
export function createProductNameSearchRequest(
  productName: string,
  indexName: string,
  page: number,
  limit: number,
): SearchRequest {
  return {
    index: indexName,
    query: {
      nested: {
        path: 'items',
        query: {
          match: { 'items.productName': productName },
        },
      },
    },
    sort: [{ createdAt: { order: 'desc' } }],
    from: (page - 1) * limit,
    size: limit,
  };
}

/**
 * Creates a search request for finding by customer ID
 */
export function createCustomerIdSearchRequest(
  customerId: string,
  indexName: string,
  page: number,
  limit: number,
): SearchRequest {
  return {
    index: indexName,
    query: {
      term: { customerId },
    },
    sort: [{ createdAt: { order: 'desc' } }],
    from: (page - 1) * limit,
    size: limit,
  };
}
