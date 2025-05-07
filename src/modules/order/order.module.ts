import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderReconciliation } from './entities/order-reconciliation.entity';
import { LoggerModule } from '../../logger/logger.module';
import { OrderElasticsearchService } from './services/order-elasticsearch.service';
import { OrderPostgresService } from './services/order-postgres.service';
import { OrderEventListener } from './events/order-event.listener';
import { OrderReconciliationService } from './services/order-reconciliation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderReconciliation]),
    ElasticsearchModule.register({
      node: process.env.ELASTICSEARCH_NODE || 'http://elasticsearch:9200',
    }),
    LoggerModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderElasticsearchService,
    OrderPostgresService,
    OrderEventListener,
    OrderReconciliationService,
  ],
  exports: [OrderService],
})
export class OrderModule {}
