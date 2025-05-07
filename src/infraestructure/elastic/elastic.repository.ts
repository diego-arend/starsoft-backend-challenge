import { Injectable, Inject, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ElasticsearchProduct } from './elastic.types';

/**
 * Repository for Elasticsearch operations
 */
@Injectable()
export class ElasticSearchRepository {
  private readonly logger = new Logger(ElasticSearchRepository.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @Inject('ELASTICSEARCH_INDEX_NAME') private readonly indexName: string,
  ) {}

  /**
   * Indexes a document in Elasticsearch
   *
   * @param document Document to be indexed (must include an ID field)
   * @returns Elasticsearch response
   */
  async indexDocument(document: any) {
    try {
      return await this.elasticsearchService.index({
        index: this.indexName,
        id: document.id,
        document,
      });
    } catch (error) {
      this.logger.error(
        `Error indexing document: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Performs a text search across indexed documents
   *
   * @param query Search text to query
   * @param fields Fields to search in
   * @returns Array of products matching the search query
   */
  async search(
    query: string,
    fields: string[] = ['name', 'description', 'category'],
  ): Promise<ElasticsearchProduct[]> {
    try {
      const result = await this.elasticsearchService.search({
        index: this.indexName,
        query: {
          multi_match: {
            query,
            fields,
          },
        },
      });

      return result.hits.hits.map(
        (item) => item._source as ElasticsearchProduct,
      );
    } catch (error) {
      this.logger.error(
        `Error performing search: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Searches using specific filters
   *
   * @param filters Object containing filter criteria to apply
   * @returns Array of products matching the filter criteria
   */
  async searchByFilters(
    filters: Record<string, any>,
  ): Promise<ElasticsearchProduct[]> {
    try {
      // Build query based on provided filters
      const must = [];

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'price' && typeof value === 'object') {
            // Price range filters
            if (value.min !== undefined) {
              must.push({ range: { price: { gte: value.min } } });
            }
            if (value.max !== undefined) {
              must.push({ range: { price: { lte: value.max } } });
            }
          } else if (key === 'createdAt' && typeof value === 'object') {
            // Date range filters
            if (value.from !== undefined) {
              must.push({ range: { createdAt: { gte: value.from } } });
            }
            if (value.to !== undefined) {
              must.push({ range: { createdAt: { lte: value.to } } });
            }
          } else {
            // Text/keyword match filters
            must.push({ match: { [key]: value } });
          }
        }
      });

      const result = await this.elasticsearchService.search({
        index: this.indexName,
        query: {
          bool: {
            must,
          },
        },
      });

      return result.hits.hits.map(
        (item) => item._source as ElasticsearchProduct,
      );
    } catch (error) {
      this.logger.error(
        `Error searching by filters: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Updates a document in the index
   *
   * @param id ID of the document to update
   * @param document Partial document with fields to update
   * @returns Elasticsearch response
   */
  async update(id: string, document: any) {
    try {
      return await this.elasticsearchService.update({
        index: this.indexName,
        id,
        doc: document,
      });
    } catch (error) {
      this.logger.error(
        `Error updating document: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Removes a document from the index
   *
   * @param id ID of the document to remove
   * @returns Elasticsearch response
   */
  async remove(id: string) {
    try {
      return await this.elasticsearchService.delete({
        index: this.indexName,
        id,
      });
    } catch (error) {
      this.logger.error(
        `Error removing document: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Bulk indexes multiple documents
   *
   * @param documents Array of documents to index (each must include an ID)
   * @returns Elasticsearch bulk operation response
   */
  async bulkIndex(documents: any[]) {
    try {
      const operations = documents.flatMap((doc) => [
        { index: { _index: this.indexName, _id: doc.id } },
        doc,
      ]);

      return await this.elasticsearchService.bulk({ operations });
    } catch (error) {
      this.logger.error(
        `Error bulk indexing documents: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
