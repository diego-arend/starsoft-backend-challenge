import { Controller, Get } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { LoggerService } from './logger/logger.service';
import { ApiTags } from '@nestjs/swagger';
import { ElasticSearchService } from './infraestructure/elastic/elastic.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly counter: Counter<string>,
    private readonly logger: LoggerService,
    private readonly elasticSearchService: ElasticSearchService,
  ) {}

  /**
   * Simple health check endpoint
   * @returns Basic health status indicating the application is running
   */
  @Get('health')
  healthCheck() {
    return {
      status: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
