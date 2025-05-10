import { Injectable, Logger } from '@nestjs/common';
import { Admin, Kafka } from 'kafkajs';

@Injectable()
export class KafkaConfigService {
  private readonly logger = new Logger(KafkaConfigService.name);

  /**
   * Returns configured Kafka brokers
   */
  getBrokers(): string[] {
    return ['kafka:29092'];
  }

  /**
   * Creates and returns a Kafka admin client
   */
  createAdminClient(clientId: string = 'starsoft-kafka-admin'): Admin {
    const kafka = new Kafka({
      clientId,
      brokers: this.getBrokers(),
    });

    return kafka.admin();
  }

  /**
   * Ensures a topic exists, creating it if necessary
   * @param topic Topic name to check/create
   */
  async ensureTopicExists(topic: string): Promise<boolean> {
    const adminClient = this.createAdminClient('starsoft-topic-creator');

    try {
      await adminClient.connect();

      const topics = await adminClient.listTopics();

      if (!topics.includes(topic)) {
        this.logger.log(`Topic ${topic} does not exist. Creating...`);

        await adminClient.createTopics({
          topics: [
            {
              topic,
              numPartitions: 3,
              replicationFactor: 1,
              configEntries: [
                { name: 'retention.ms', value: '604800000' }, // 7 days retention
                { name: 'cleanup.policy', value: 'delete' },
              ],
            },
          ],
          waitForLeaders: true,
        });

        this.logger.log(`✅ Topic ${topic} created successfully`);
        return true;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `❌ Error checking/creating topic ${topic}: ${error.message}`,
        error.stack,
      );
      return false;
    } finally {
      try {
        await adminClient.disconnect();
      } catch (error) {
        this.logger.warn(`Error disconnecting admin client: ${error.message}`);
      }
    }
  }

  /**
   * Creates the standard Kafka message headers
   */
  createMessageHeaders(eventType?: string): Record<string, string> {
    const headers: Record<string, string> = {
      timestamp: Date.now().toString(),
      source: 'starsoft-backend',
    };

    if (eventType) {
      headers.event_type = eventType;
    }

    return headers;
  }
}
