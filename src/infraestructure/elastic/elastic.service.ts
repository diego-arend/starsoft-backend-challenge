import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { ElasticSearchRepository } from './elastic.repository';

/**
 * Service for managing Elasticsearch operations
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
            id: { type: 'keyword' },
            status: { type: 'keyword' },
            total: { type: 'float' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            items: {
              type: 'nested',
              properties: {
                id: { type: 'keyword' },
                productId: { type: 'keyword' },
                price: { type: 'float' },
                quantity: { type: 'integer' },
                product: {
                  type: 'object',
                  properties: {
                    id: { type: 'keyword' },
                    name: { type: 'text', analyzer: 'standard' },
                    category: { type: 'keyword' },
                  },
                },
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
      this.logger.log(`Index ${this.indexName} created successfully`);
    }
  }

  /**
   * Checks the health status of the Elasticsearch cluster
   *
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
   *
   * @param entities List of entities to be indexed
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

  // Repository delegate methods

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
