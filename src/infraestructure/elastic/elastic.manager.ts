import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';

/**
 * Manages Elasticsearch index creation and health checks
 *
 * This service handles the initialization and management of Elasticsearch indices,
 * providing methods to create indices with proper mappings and check the health
 * of the Elasticsearch cluster.
 */
@Injectable()
export class ElasticSearchManager {
  private readonly logger = new Logger(ElasticSearchManager.name);
  private readonly indexName: string;

  /**
   * Initialize the ElasticSearchManager with required dependencies
   *
   * @param elasticsearchService - Service for interacting with Elasticsearch
   * @param configService - Service for accessing application configuration
   */
  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {
    // Get index name from config with fallback to 'products'
    this.indexName =
      this.configService.get('ELASTICSEARCH_INDEX') || 'products';
  }

  /**
   * Creates the Elasticsearch index if it doesn't exist
   *
   * This method checks if the configured index exists and creates it
   * with the appropriate mappings for product data if it doesn't.
   * The mappings define how documents and their fields are stored and indexed.
   */
  async createIndex() {
    // Check if index already exists
    const indexExists = await this.elasticsearchService.indices.exists({
      index: this.indexName,
    });

    if (!indexExists) {
      // Create index with field mappings for product data
      await this.elasticsearchService.indices.create({
        index: this.indexName,
        mappings: {
          properties: {
            id: { type: 'keyword' }, // Exact match for IDs
            name: { type: 'text' }, // Full-text search for names
            description: { type: 'text' }, // Full-text search for descriptions
            price: { type: 'float' }, // Numeric field for prices
            category: { type: 'keyword' }, // Exact match for categories
            createdAt: { type: 'date' }, // Date field for timestamps
          },
        },
      });
      this.logger.log(`Index ${this.indexName} created successfully`);
    }
  }

  /**
   * Checks the health of the Elasticsearch cluster
   *
   * This method queries the Elasticsearch cluster health API to get
   * information about the current state of the cluster, including status
   * (green, yellow, red) and node information.
   *
   * @returns The health information from Elasticsearch
   * @throws Error if the health check fails
   */
  async healthCheck() {
    try {
      const healthInfo = await this.elasticsearchService.cluster.health();
      this.logger.log(
        `Elasticsearch health status: ${JSON.stringify(healthInfo)}`,
      );
      return healthInfo;
    } catch (error) {
      this.logger.error('Elasticsearch health check failed', error);
      throw error;
    }
  }

  /**
   * Returns the configured index name
   *
   * @returns The name of the Elasticsearch index being used
   */
  getIndexName() {
    return this.indexName;
  }
}
