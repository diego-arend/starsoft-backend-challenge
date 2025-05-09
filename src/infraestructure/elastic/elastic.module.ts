import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticSearchRepository } from './elastic.repository';
import { ElasticSearchService } from './elastic.service';

/**
 * Module for handling Elasticsearch integration in the application
 */
@Module({
  imports: [
    ConfigModule,
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        node: configService.get('ELASTICSEARCH_NODE'),
        auth: {
          username: configService.get('ELASTICSEARCH_USERNAME') || '',
          password: configService.get('ELASTICSEARCH_PASSWORD') || '',
        },
        maxRetries: 10,
        requestTimeout: 60000,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    ElasticSearchRepository,
    ElasticSearchService,
    {
      provide: 'ELASTICSEARCH_INDEX_NAME',
      useFactory: (configService: ConfigService) => {
        return configService.get('ELASTICSEARCH_INDEX');
      },
      inject: [ConfigService],
    },
  ],
  exports: [ElasticSearchService],
})
export class ElasticSearchModule {}
