import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { KafkaConfigService } from './kafka-config.service';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaProducerService.name);
  private isConnected = false;
  private connectionAttempts = 0;
  private readonly MAX_ATTEMPTS = 10;
  private connectionTimer: NodeJS.Timeout | null = null;
  private publishQueue: Array<{ topic: string; message: any; key?: string }> =
    [];
  private processingQueue = false;

  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
    private readonly kafkaConfig: KafkaConfigService,
  ) {}

  async onModuleInit() {
    setTimeout(() => this.tryConnect(), 20000);
  }

  private async tryConnect(delay = 5000) {
    try {
      this.connectionAttempts++;
      this.logger.log(
        `Attempting to connect to Kafka (${this.connectionAttempts}/${this.MAX_ATTEMPTS})...`,
      );

      await this.kafkaClient.connect();

      this.isConnected = true;
      this.logger.log('✅ Kafka client connected successfully!');

      // Clear the timer if it exists
      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
        this.connectionTimer = null;
      }

      // Process queued messages upon connection
      if (this.publishQueue.length > 0) {
        this.logger.log(
          `Processing ${this.publishQueue.length} queued messages...`,
        );
        this.processQueue();
      }
    } catch (error) {
      this.logger.warn(`❌ Failed to connect to Kafka: ${error.message}`);

      if (this.connectionAttempts < this.MAX_ATTEMPTS) {
        this.logger.log(`Trying again in ${delay / 1000} seconds...`);
        this.connectionTimer = setTimeout(
          () => this.tryConnect(Math.min(delay * 1.5, 30000)),
          delay,
        );
      } else {
        this.logger.error(
          'Maximum connection attempts reached. Operating without Kafka.',
        );
      }
    }
  }

  /**
   * Process the queue of pending messages
   */
  private async processQueue() {
    if (this.processingQueue || this.publishQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      const currentQueue = [...this.publishQueue];
      this.publishQueue = [];

      for (const item of currentQueue) {
        try {
          await this.doPublish(item.topic, item.message, item.key);
        } catch (error) {
          this.logger.error(
            `Error processing queued message for topic ${item.topic}: ${error.message}`,
            error.stack,
          );

          if (
            error.message.includes('ECONNREFUSED') ||
            error.message.includes('not connected') ||
            error.message.includes('leadership election')
          ) {
            this.publishQueue.push(item);
          }
        }
      }
    } finally {
      this.processingQueue = false;

      if (this.publishQueue.length > 0) {
        setTimeout(() => this.processQueue(), 5000);
      }
    }
  }

  /**
   * Publishes an event to a Kafka topic with failure handling
   */
  async publish(topic: string, message: any, key?: string): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(
        `Cannot publish to topic ${topic} - Kafka connection not established. Adding to queue.`,
      );

      this.publishQueue.push({ topic, message, key });

      if (
        !this.connectionTimer &&
        this.connectionAttempts < this.MAX_ATTEMPTS
      ) {
        this.connectionAttempts = 0;
        this.tryConnect();
      }

      return;
    }

    try {
      // Ensure topic exists using the config service
      await this.kafkaConfig.ensureTopicExists(topic);

      await this.doPublish(topic, message, key);
    } catch (error) {
      this.logger.error(
        `❌ Failed to publish event to topic ${topic}: ${error.message}`,
        error.stack,
      );

      if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('not connected') ||
        error.message.includes('leadership election')
      ) {
        this.publishQueue.push({ topic, message, key });
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.tryConnect(1000);
      }
    }
  }

  /**
   * Implementation of Kafka message publishing
   */
  private async doPublish(
    topic: string,
    message: any,
    key?: string,
  ): Promise<void> {
    const messageValue =
      typeof message === 'object' ? JSON.stringify(message) : String(message);

    // Extract event_type if present in the message
    const eventType = message?.event_type;

    await this.kafkaClient.emit(topic, {
      key: key || `${topic}-${Date.now()}`,
      value: messageValue,
      headers: this.kafkaConfig.createMessageHeaders(eventType),
    });

    this.logger.log(
      `✅ Event published to topic ${topic}${eventType ? ` (${eventType})` : ''}`,
    );
  }
}
