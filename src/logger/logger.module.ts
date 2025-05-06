import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [MetricsModule],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
