import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private producer: Producer;

  constructor(private readonly configService: ConfigService) {
    const brokers = this.configService
      .get<string>('KAFKA_BROKERS', 'localhost:9092')
      .split(',')
      .map((broker) => broker.trim());
    const clientId = this.configService.get<string>('KAFKA_CLIENT_ID', 'ms-quotas');
    const kafka = new Kafka({ clientId, brokers });
    this.producer = kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async publish(topic: string, payload: object) {
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }],
    });
  }
}
