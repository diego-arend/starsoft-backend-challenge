import { Module, Global } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller';
import { metricsProviders } from './metrics.providers';

/**
 * Global module for application metrics
 */
@Global()
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      path: '/metrics',
    }),
  ],
  controllers: [MetricsController],
  providers: [...metricsProviders],
  exports: [...metricsProviders, PrometheusModule],
})
export class MetricsModule {}
