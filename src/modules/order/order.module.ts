import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { LoggerModule } from '../../logger/logger.module';
import { OrderElasticsearchService } from './services/order-elasticsearch.service';
import { OrderPostgresService } from './services/order-postgres.service';
import { OrderEventListener } from './events/order-event.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
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
  ],
  exports: [OrderService],
})
export class OrderModule {}
