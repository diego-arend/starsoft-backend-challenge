import { Injectable, Inject, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ElasticsearchProduct } from './elastic.types';

/**
 * Repository for Elasticsearch operations
 *
 * Handles low-level interactions with Elasticsearch such as indexing,
 * searching, updating, and deleting documents.
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
   * Creates or updates a document in the Elasticsearch index.
   * The document must contain an ID that will be used as the document identifier.
   *
   * @param document Document to be indexed (must include an ID field)
   * @returns Elasticsearch response with operation status
   * @throws Error if the indexing operation fails
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
   * Executes a multi-match query against specified fields in the Elasticsearch index.
   *
   * @param query Search text to query
   * @param fields Fields to search in (defaults to name, description, category)
   * @returns Array of products matching the search query
   * @throws Error if the search operation fails
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
   * Performs an advanced search with structured filters such as:
   * - Exact match filters (e.g., category)
   * - Range filters for numeric values (e.g., price min/max)
   * - Date range filters (from/to dates)
   *
   * @param filters Object containing filter criteria to apply
   * @returns Array of products matching the filter criteria
   * @throws Error if the filtered search operation fails
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
   * Applies a partial update to an existing document,
   * only modifying the fields included in the document parameter.
   *
   * @param id ID of the document to update
   * @param document Partial document with fields to update
   * @returns Elasticsearch response with operation status
   * @throws Error if the update operation fails
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
   * Deletes a document from Elasticsearch based on its ID.
   *
   * @param id ID of the document to remove
   * @returns Elasticsearch response with operation status
   * @throws Error if the delete operation fails
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
   * Efficiently indexes a batch of documents in a single operation.
   * This is much more efficient than indexing documents one at a time.
   *
   * @param documents Array of documents to index (each must include an ID)
   * @returns Elasticsearch bulk operation response
   * @throws Error if the bulk indexing operation fails
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
