import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KafkaInitializerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaInitializerService.name);
  private readonly kafka: Kafka;
  private readonly topics = ['order-events']; // Lista de tópicos que precisamos criar

  constructor(private readonly configService: ConfigService) {
    const brokers = this.configService
      .get<string>('KAFKA_BROKERS', 'kafka:29092')
      .split(',');

    this.kafka = new Kafka({
      clientId: 'starsoft-kafka-initializer',
      brokers,
    });
  }

  async onModuleInit() {
    await this.initializeKafkaTopics();
  }

  private async initializeKafkaTopics(): Promise<void> {
    const admin = this.kafka.admin();

    try {
      this.logger.log('Conectando ao Kafka Admin...');
      await admin.connect();

      this.logger.log('Listando tópicos existentes...');
      const existingTopics = await admin.listTopics();

      // Filtrando apenas os tópicos que ainda não existem
      const topicsToCreate = this.topics.filter(
        (topic) => !existingTopics.includes(topic),
      );

      if (topicsToCreate.length === 0) {
        this.logger.log(
          'Todos os tópicos já existem. Nenhum tópico para criar.',
        );
        return;
      }

      this.logger.log(`Criando tópicos: ${topicsToCreate.join(', ')}`);

      await admin.createTopics({
        topics: topicsToCreate.map((topic) => ({
          topic,
          numPartitions: 3, // Número de partições para paralelismo
          replicationFactor: 1, // Fator de replicação (1 para ambiente dev)
          configEntries: [
            { name: 'retention.ms', value: '604800000' }, // 7 dias de retenção
            { name: 'cleanup.policy', value: 'delete' }, // Política de limpeza
          ],
        })),
        waitForLeaders: true, // Aguardar que os líderes sejam eleitos
        timeout: 10000, // Timeout de 10 segundos
      });

      this.logger.log(
        `✅ Tópicos criados com sucesso: ${topicsToCreate.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erro ao inicializar tópicos do Kafka: ${error.message}`,
        error.stack,
      );
    } finally {
      await admin.disconnect();
    }
  }
}
