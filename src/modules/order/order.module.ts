import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderPostgresService } from './services/order-postgres.service';
import { OrderElasticsearchService } from './services/order-elasticsearch.service';
import { OrderReconciliationService } from './services/order-reconciliation.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderReconciliation } from './entities/order-reconciliation.entity';
import { APP_FILTER } from '@nestjs/core';
import { OrderExceptionFilter } from './filters/order-exception.filter';
import { LoggerModule } from '../../logger/logger.module';
import { ElasticsearchConfigModule } from '../../infraestructure/elasticsearch/elasticsearch.module';
import { OrderEventsListener } from './listeners/order-events.listener';
import { KafkaModule } from '../../kafka/kafka.module';
import { OrderEventsService } from './services/order-events.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderReconciliation]),
    LoggerModule,
    ElasticsearchConfigModule,
    KafkaModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderPostgresService,
    OrderElasticsearchService,
    OrderReconciliationService,
    OrderEventsListener,
    OrderEventsService,
    {
      provide: APP_FILTER,
      useClass: OrderExceptionFilter,
    },
  ],
  exports: [OrderService],
})
export class OrderModule {}
