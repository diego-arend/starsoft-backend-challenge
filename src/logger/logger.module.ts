import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { MetricsModule } from '../metrics/metrics.module';

/**
 * Module that provides logging functionality throughout the application
 */
@Module({
  imports: [MetricsModule],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
