import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { MetricsModule } from './metrics/metrics.module';
import { LoggerModule } from './logger/logger.module';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TraceIdInterceptor } from './interceptors/trace-id.interceptor';
import { ElasticSearchModule } from './infraestructure/elastic/elastic.module';
import { getTypeOrmConfig } from './infraestructure/postgress/dataSource';
import { OrderModule } from './modules/order/order.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),
    MetricsModule,
    LoggerModule,
    ElasticSearchModule,
    OrderModule,
  ],
  controllers: [AppController],
  providers: [
    MetricsInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceIdInterceptor,
    },
  ],
})
export class AppModule {}
