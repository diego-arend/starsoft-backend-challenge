import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { MetricsModule } from './metrics/metrics.module';
import { LoggerModule } from './logger/logger.module';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { TraceIdInterceptor } from './interceptors/trace-id.interceptor';
import { getTypeOrmConfig } from './infraestructure/postgress/dataSource';
import { OrderModule } from './modules/order/order.module';
import { CommonModule } from './common/common.module';
import { OrderExceptionFilter } from './modules/order/filters/order-exception.filter';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ElasticsearchExceptionFilter } from './common/filters/elasticsearch-exception.filter';
import { UuidValidationFilter } from './common/filters/uuid-validation.filter';
import { SearchModule } from './modules/search/search.module';
import { ElasticsearchConfigModule } from './infraestructure/elasticsearch/elasticsearch.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),
    MetricsModule,
    LoggerModule,
    OrderModule,
    CommonModule,
    EventEmitterModule.forRoot(),
    SearchModule,
    ElasticsearchConfigModule,
  ],
  controllers: [AppController],
  providers: [
    MetricsInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceIdInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: UuidValidationFilter,
    },
    {
      provide: APP_FILTER,
      useClass: OrderExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ElasticsearchExceptionFilter,
    },
  ],
})
export class AppModule {}
