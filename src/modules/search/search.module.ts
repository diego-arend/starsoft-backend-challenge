import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { CommonModule } from '../../common/common.module';
import { ElasticsearchConfigModule } from '../../infraestructure/elasticsearch/elasticsearch.module';
import { LoggerModule } from '../../logger/logger.module';

@Module({
  imports: [CommonModule, ElasticsearchConfigModule, LoggerModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
