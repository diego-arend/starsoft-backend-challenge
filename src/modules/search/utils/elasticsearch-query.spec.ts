import { ElasticsearchQueryBuilder } from './elasticsearch-query.util';
import { OrderStatus } from '../../order/entities/order.entity';

describe('ElasticsearchQueryBuilder', () => {
  describe('buildStatusQuery', () => {
    it('should create a valid term query for status', () => {
      const status = OrderStatus.PENDING;
      const query = ElasticsearchQueryBuilder.buildStatusQuery(status);

      expect(query).toEqual({
        term: { status: OrderStatus.PENDING },
      });
    });
  });

  describe('buildDateRangeQuery', () => {
    it('should create range query with both from and to', () => {
      const dateRange = { from: '2023-01-01', to: '2023-12-31' };
      const query = ElasticsearchQueryBuilder.buildDateRangeQuery(dateRange);

      expect(query).toEqual({
        range: {
          createdAt: {
            gte: '2023-01-01',
            lte: '2023-12-31',
          },
        },
      });
    });

    it('should create range query with only from', () => {
      const dateRange = { from: '2023-01-01' };
      const query = ElasticsearchQueryBuilder.buildDateRangeQuery(dateRange);

      expect(query).toEqual({
        range: {
          createdAt: {
            gte: '2023-01-01',
          },
        },
      });
    });

    it('should create range query with only to', () => {
      const dateRange = { to: '2023-12-31' };
      const query = ElasticsearchQueryBuilder.buildDateRangeQuery(dateRange);

      expect(query).toEqual({
        range: {
          createdAt: {
            lte: '2023-12-31',
          },
        },
      });
    });
  });

  describe('buildItemsQuery', () => {
    it('should create a bool query with should clauses', () => {
      const itemTerms = ['smartphone', 'laptop'];
      const query = ElasticsearchQueryBuilder.buildItemsQuery(itemTerms);

      expect(query).toEqual({
        bool: {
          should: [
            {
              multi_match: {
                query: 'smartphone',
                fields: ['items.productName^3', 'items.description'],
                type: 'phrase',
              },
            },
            {
              multi_match: {
                query: 'laptop',
                fields: ['items.productName^3', 'items.description'],
                type: 'phrase',
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    });
  });
});
