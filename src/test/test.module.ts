import { Module } from '@nestjs/common';
import { elasticsearchProviders } from './providers/elasticsearch.provider';

/**
 * Módulo para centralizar providers comuns de teste
 */
@Module({
  providers: [...elasticsearchProviders],
  exports: [...elasticsearchProviders],
})
export class TestModule {}
