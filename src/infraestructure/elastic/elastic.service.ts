import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { ElasticSearchRepository } from './elastic.repository';

/**
 * Service for managing Elasticsearch operations
 *
 * Provides high-level functionality for working with Elasticsearch including
 * index initialization, health monitoring, searching, and indexing operations.
 * Implements OnModuleInit to ensure Elasticsearch is properly set up when the application starts.
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
   *
   * Called automatically by NestJS when the module initializes.
   * Sets up the Elasticsearch index and verifies the connection.
   */
  async onModuleInit() {
    await this.setupElasticsearch();
  }

  /**
   * Configures Elasticsearch, checking and creating indices if necessary
   *
   * Performs initial setup tasks:
   * 1. Checks Elasticsearch health/connection
   * 2. Creates required indices if they don't exist
   *
   * Note: The method suppresses errors to allow the application to function
   * even if Elasticsearch is not available.
   */
  async setupElasticsearch() {
    try {
      // Check connection to Elasticsearch
      await this.healthCheck();

      // Create index if it doesn't exist
      await this.createIndex();

      this.logger.log('Elasticsearch configured successfully');
    } catch (error) {
      this.logger.error(
        `Error configuring Elasticsearch: ${error.message}`,
        error.stack,
      );
      // Don't throw exception to allow the application to function even without Elasticsearch
    }
  }

  /**
   * Creates the index if it doesn't exist, with appropriate mapping for searches
   *
   * Sets up the Elasticsearch index with proper mappings optimized for order data:
   * - Keyword fields for exact matching (IDs, status)
   * - Text fields for full-text search
   * - Nested mappings for order items
   * - Date fields with appropriate formats
   * - Custom analyzer settings
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
            id: { type: 'keyword' }, // For exact ID matching
            status: { type: 'keyword' }, // For filtering by order status
            total: { type: 'float' }, // For range queries on order total
            createdAt: { type: 'date' }, // For date range filtering
            updatedAt: { type: 'date' }, // For date range filtering
            items: {
              type: 'nested', // Nested type for array of complex objects
              properties: {
                id: { type: 'keyword' },
                productId: { type: 'keyword' },
                price: { type: 'float' },
                quantity: { type: 'integer' },
                product: {
                  type: 'object', // Object type for product details
                  properties: {
                    id: { type: 'keyword' },
                    name: { type: 'text', analyzer: 'standard' }, // For full-text search
                    category: { type: 'keyword' }, // For category filtering
                  },
                },
              },
            },
          },
        },
        settings: {
          number_of_shards: 1, // Single shard for development
          number_of_replicas: 0, // No replicas for development
          analysis: {
            analyzer: {
              standard: {
                type: 'standard',
                stopwords: '_none_', // Don't filter out stopwords
              },
            },
          },
        },
      });
      this.logger.log(`Index ${this.indexName} created successfully`);
    }
  }

  /**
   * Checks the health status of the Elasticsearch cluster
   *
   * Provides diagnostic information about the current state of the
   * Elasticsearch cluster, including status (green, yellow, red).
   *
   * @returns The health information from Elasticsearch
   * @throws Error if the health check fails
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
   *
   * Efficiently indexes a large number of entities using bulk operations
   * when appropriate. For larger datasets, it splits the operation into
   * batches to avoid memory issues and improve performance.
   *
   * @param entities List of entities to be indexed
   * @throws Error if the reindexing operation fails
   */
  async reindexAll(entities: any[]) {
    this.logger.log(
      `Reindexing ${entities.length} documents to Elasticsearch...`,
    );

    try {
      // For large volumes, better to use bulk operations
      if (entities.length > 100) {
        // Split into batches of 100 documents
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
        // For small number of documents, index one by one
        for (const entity of entities) {
          await this.elasticRepository.indexDocument(entity);
        }
      }

      this.logger.log('Reindexing completed successfully');
    } catch (error) {
      this.logger.error(
        `Error during reindexing: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Repository delegate methods for API compatibility

  /**
   * Indexes a single document in Elasticsearch
   *
   * @param document Document to be indexed (must include id)
   * @returns Result of the indexing operation
   */
  async indexDocument(document: any) {
    return this.elasticRepository.indexDocument(document);
  }

  /**
   * Performs a text search across documents
   *
   * @param query Text to search for
   * @param fields Optional array of fields to search within
   * @returns Array of matching documents
   */
  async search(query: string, fields?: string[]) {
    return this.elasticRepository.search(query, fields);
  }

  /**
   * Searches using specific filters
   *
   * @param filters Object containing filter criteria
   * @returns Array of documents matching the filters
   */
  async searchByFilters(filters: Record<string, any>) {
    return this.elasticRepository.searchByFilters(filters);
  }

  /**
   * Updates an existing document
   *
   * @param id ID of the document to update
   * @param document Partial document with fields to update
   * @returns Result of the update operation
   */
  async update(id: string, document: any) {
    return this.elasticRepository.update(id, document);
  }

  /**
   * Removes a document from the index
   *
   * @param id ID of the document to remove
   * @returns Result of the remove operation
   */
  async remove(id: string) {
    return this.elasticRepository.remove(id);
  }
}
