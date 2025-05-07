import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';

/**
 * Manages Elasticsearch index creation and health checks
 */
@Injectable()
export class ElasticSearchManager {
  private readonly logger = new Logger(ElasticSearchManager.name);
  private readonly indexName: string;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {
    this.indexName =
      this.configService.get('ELASTICSEARCH_INDEX') || 'products';
  }

  /**
   * Creates the Elasticsearch index if it doesn't exist
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
            name: { type: 'text' },
            description: { type: 'text' },
            price: { type: 'float' },
            category: { type: 'keyword' },
            createdAt: { type: 'date' },
          },
        },
      });
      this.logger.log(`Index ${this.indexName} created successfully`);
    }
  }

  /**
   * Checks the health of the Elasticsearch cluster
   *
   * @returns The health information from Elasticsearch
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
   */
  getIndexName() {
    return this.indexName;
  }
}
