import { OrderStatus } from '../../order/entities/order.entity';
import { DateRangeParams } from '../types/search.types';

/**
 * Utility class for building Elasticsearch queries
 */
export class ElasticsearchQueryBuilder {
  /**
   * Creates a query for finding orders by status
   * @param status Order status
   * @returns Elasticsearch query object
   */
  static buildStatusQuery(status: OrderStatus): any {
    return {
      term: { status },
    };
  }

  /**
   * Creates a date range query
   * @param dateRange Date range parameters
   * @returns Elasticsearch query object
   */
  static buildDateRangeQuery(dateRange: DateRangeParams): any {
    const rangeQuery: any = { range: { createdAt: {} } };

    if (dateRange.from) {
      rangeQuery.range.createdAt.gte = dateRange.from;
    }

    if (dateRange.to) {
      rangeQuery.range.createdAt.lte = dateRange.to;
    }

    return rangeQuery;
  }

  /**
   * Creates a query for finding items by name or description
   * @param itemTerms Array of item terms to search for
   * @returns Elasticsearch query object
   */
  static buildItemsQuery(itemTerms: string[]): any {
    return {
      bool: {
        should: itemTerms.map((item) => ({
          multi_match: {
            query: item,
            fields: ['items.productName^3', 'items.description'],
            type: 'phrase',
          },
        })),
        minimum_should_match: 1,
      },
    };
  }
}
