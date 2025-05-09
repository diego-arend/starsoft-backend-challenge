import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { ElasticSearchRepository } from './elastic.repository';

/**
 * Service for managing Elasticsearch operations
 * Handles index creation, document operations, and search functionality
 */
@Injectable()
export class ElasticSearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticSearchService.name);
  private readonly indexName: string;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
    private readonly elasticRepository: ElasticSearchRepository,
  ) {
    this.indexName = this.configService.get('ELASTICSEARCH_INDEX');
  }

  /**
   * Initializes the Elasticsearch service when the module is loaded
   */
  async onModuleInit() {
    await this.setupElasticsearch();
  }

  /**
   * Configures Elasticsearch, checking and creating indices if necessary
   */
  async setupElasticsearch() {
    try {
      await this.healthCheck();
      await this.createIndex();
      this.logger.log('Elasticsearch configured successfully');
    } catch (error) {
      this.logger.error(
        `Error configuring Elasticsearch: ${error.message}`,
        error.stack,
      );
      // Application continues to function even without Elasticsearch
    }
  }

  /**
   * Creates the index if it doesn't exist, with appropriate mapping for searches
   */
  async createIndex() {
    const indexExists = await this.elasticsearchService.indices.exists({
      index: this.indexName,
    });

    if (!indexExists) {
      await this.elasticsearchService.indices.create({
        index: this.indexName,
        mappings: {
          properties: {
            uuid: { type: 'keyword' },
            customerId: { type: 'keyword' },
            status: { type: 'keyword' },
            total: { type: 'float' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            items: {
              type: 'nested',
              properties: {
                uuid: { type: 'keyword' },
                productId: { type: 'keyword' },
                productName: { type: 'text', analyzer: 'standard' },
                price: { type: 'float' },
                quantity: { type: 'integer' },
                subtotal: { type: 'float' },
              },
            },
          },
        },
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          analysis: {
            analyzer: {
              standard: {
                type: 'standard',
                stopwords: '_none_',
              },
            },
          },
        },
      });
      this.logger.log(`Index ${this.indexName} created`);
    }
  }

  /**
   * Checks the health status of the Elasticsearch cluster
   * @returns The health information from Elasticsearch
   */
  async healthCheck() {
    try {
      const healthInfo = await this.elasticsearchService.cluster.health();
      this.logger.log(`Elasticsearch cluster status: ${healthInfo.status}`);
      return healthInfo;
    } catch (error) {
      this.logger.error(
        `Elasticsearch health check failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Re-indexes all data from the database to Elasticsearch
   * @param entities - List of entities to be indexed
   */
  async reindexAll(entities: any[]) {
    this.logger.log(`Reindexing ${entities.length} documents`);

    try {
      if (entities.length > 100) {
        // Process in batches for large volumes
        const batches = [];
        for (let i = 0; i < entities.length; i += 100) {
          batches.push(entities.slice(i, i + 100));
        }

        for (const batch of batches) {
          const bulkOperations = batch.flatMap((doc) => [
            { index: { _index: this.indexName, _id: doc.id } },
            doc,
          ]);

          await this.elasticsearchService.bulk({ operations: bulkOperations });
        }
      } else {
        // Index one by one for small volumes
        for (const entity of entities) {
          await this.elasticRepository.indexDocument(entity);
        }
      }

      this.logger.log('Reindexing completed');
    } catch (error) {
      this.logger.error(
        `Error during reindexing: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Indexes a single document in Elasticsearch
   * @param document - Document to be indexed (must include id)
   * @returns Result of the indexing operation
   */
  async indexDocument(document: any) {
    return this.elasticRepository.indexDocument(document);
  }

  /**
   * Performs a search in Elasticsearch
   * @param index - Name of the index to search
   * @param queryParams - Query parameters as JSON string or object
   * @returns Array of matching documents
   */
  async search(index: string, queryParams: any[]) {
    try {
      // Parse the query JSON if it's a string
      const parsedQuery = queryParams.map((param) =>
        typeof param === 'string' ? JSON.parse(param) : param,
      );

      // Term query handling (e.g. findOneByUuid)
      if (parsedQuery[0]?.query?.term) {
        const field = Object.keys(parsedQuery[0].query.term)[0];
        const value = parsedQuery[0].query.term[field].value;

        const result = await this.elasticsearchService.search({
          index,
          query: {
            term: {
              [field]: value,
            },
          },
        } as any);

        return this.transformSearchResult(result);
      }

      // Match all query handling (e.g. findAll)
      if (parsedQuery[0]?.query?.match_all) {
        const from = parsedQuery[0].from || 0;
        const size = parsedQuery[0].size || 10;
        const sort = parsedQuery[0].sort || [];

        const result = await this.elasticsearchService.search({
          index,
          from,
          size,
          query: { match_all: {} },
          sort,
        } as any);

        return this.transformSearchResult(result);
      }

      // Generic query handling
      const result = await this.elasticsearchService.search({
        index,
        ...parsedQuery[0],
      } as any);

      return this.transformSearchResult(result);
    } catch (error) {
      this.logger.error(`Search error: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Transforms Elasticsearch result to a more usable format
   * @param result - Raw Elasticsearch response
   * @returns Array of documents with source and ID information
   */
  private transformSearchResult(result: any) {
    if (!result.hits) {
      return [];
    }

    return result.hits.hits.map((hit) => ({
      ...hit._source,
      id: hit._id,
    }));
  }

  /**
   * Searches using specific filters
   * @param filters - Object containing filter criteria
   * @returns Array of documents matching the filters
   */
  async searchByFilters(filters: Record<string, any>) {
    return this.elasticRepository.searchByFilters(filters);
  }

  /**
   * Adds or updates a document in the index
   * @param index - Name of the index
   * @param id - ID of the document
   * @param document - Document to index/update (string or object)
   * @returns Result of the operation
   */
  async index(index: string, id: string, document: string | any) {
    try {
      const parsedDoc =
        typeof document === 'string' ? JSON.parse(document) : document;

      const result = await this.elasticsearchService.index({
        index,
        id,
        document: parsedDoc,
        refresh: true,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Error indexing document: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Updates an existing document
   * @param index - Name of the index
   * @param id - ID of the document to update
   * @param document - Document with fields to update (string or object)
   * @returns Result of the update operation
   */
  async update(index: string, id: string, document: string | any) {
    try {
      const parsedDoc =
        typeof document === 'string' ? JSON.parse(document) : document;

      const result = await this.elasticsearchService.update({
        index,
        id,
        doc: parsedDoc,
        refresh: true,
      });

      return result;
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
   * @param index - Name of the index
   * @param id - ID of the document to remove
   * @returns Result of the delete operation
   */
  async delete(index: string, id: string) {
    try {
      const result = await this.elasticsearchService.delete({
        index,
        id,
        refresh: true,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Error deleting document: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Performs a bulk operation
   * @param operations - Array of operations to perform (string or object)
   * @returns Result of the bulk operation
   */
  async bulk(operations: string | any) {
    try {
      const parsedOps =
        typeof operations === 'string' ? JSON.parse(operations) : operations;

      const result = await this.elasticsearchService.bulk({
        operations: parsedOps,
        refresh: true,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Error in bulk operation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Checks if an index exists
   * @param index - Name of the index to check
   * @returns True if index exists, false otherwise
   */
  async indexExists(index: string): Promise<boolean> {
    try {
      return await this.elasticsearchService.indices.exists({ index });
    } catch (error) {
      this.logger.error(
        `Error checking if index exists: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Executes a search query and returns the complete Elasticsearch response
   * This preserves metadata like total document count
   * @param index - Name of the index to search
   * @param queryParams - Query parameters as JSON string or object
   * @returns Complete Elasticsearch response with metadata
   */
  async searchWithMeta(index: string, queryParams: any[]): Promise<any> {
    try {
      // Parse the query JSON if it's a string
      const parsedQuery = queryParams.map((param) =>
        typeof param === 'string' ? JSON.parse(param) : param,
      );

      // Ensure track_total_hits is enabled to get accurate count
      if (parsedQuery[0] && !parsedQuery[0].track_total_hits) {
        parsedQuery[0].track_total_hits = true;
      }

      const searchParams = {
        index,
        ...parsedQuery[0],
      };

      const result = await this.elasticsearchService.search(
        searchParams as any,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error in searchWithMeta: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
