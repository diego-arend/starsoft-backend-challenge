import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaProducerService } from './kafka-producer.service';
import { KafkaConfigService } from './kafka-config.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => {
          const brokers = configService.get<string>(
            'KAFKA_BROKERS',
            'kafka:29092',
          );

          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: 'starsoft-service',
                brokers: brokers.split(','),
                retry: {
                  initialRetryTime: 1000,
                  retries: 15,
                  maxRetryTime: 30000,
                  factor: 1.5,
                },
                connectionTimeout: 15000,
                requestTimeout: 30000,
              },
              producer: {
                allowAutoTopicCreation: true,
                idempotent: true,
                maxOutgoingBatchSize: 10,
                retry: {
                  initialRetryTime: 500,
                  retries: 10,
                },
              },
              consumer: {
                groupId: 'starsoft-service-group',
                sessionTimeout: 60000,
                rebalanceTimeout: 120000,
              },
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [KafkaConfigService, KafkaProducerService],
  exports: [KafkaProducerService, KafkaConfigService],
})
export class KafkaModule {}
