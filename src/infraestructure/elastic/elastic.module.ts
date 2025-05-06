import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticSearchRepository } from './elastic.repository';
import { ElasticSearchService } from './elastic.service';

/**
 * Module for handling Elasticsearch integration in the application
 *
 * This module manages the Elasticsearch connection, configuration,
 * and provides services for interacting with Elasticsearch.
 */
@Module({
  imports: [
    // Import ConfigModule to make ConfigService available for configuration
    ConfigModule,

    /**
     * Register Elasticsearch connection with async configuration
     *
     * Using registerAsync allows us to use environment variables
     * and ConfigService for setting up the connection dynamically.
     */
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // Set Elasticsearch connection URL from environment variables or use default
        node: configService.get('ELASTICSEARCH_NODE'),

        // Authentication credentials for Elasticsearch
        auth: {
          username: configService.get('ELASTICSEARCH_USERNAME') || '',
          password: configService.get('ELASTICSEARCH_PASSWORD') || '',
        },

        // Connection resilience settings
        maxRetries: 10, // Number of retry attempts for failed requests
        requestTimeout: 60000, // Request timeout in milliseconds (60 seconds)
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    // Repository for handling Elasticsearch CRUD operations
    ElasticSearchRepository,

    // Service that exposes Elasticsearch functionality to the application
    ElasticSearchService,

    /**
     * Provider for Elasticsearch index name
     *
     * This creates a named injection token that can be used across the application
     * to maintain consistency in the index name used for Elasticsearch operations.
     */
    {
      provide: 'ELASTICSEARCH_INDEX_NAME',
      useFactory: (configService: ConfigService) => {
        // Get index name from environment variables
        return configService.get('ELASTICSEARCH_INDEX');
      },
      inject: [ConfigService],
    },
  ],

  // Export the repository and service to make them available to other modules
  exports: [ElasticSearchRepository, ElasticSearchService],
})
export class ElasticSearchModule {}
