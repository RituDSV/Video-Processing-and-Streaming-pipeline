import { Inject, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class KafkaProducerService
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @Inject('KAFKA_CLIENT')
    private readonly kafka: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafka.connect();
  }

  async emit<T>(topic: string, payload: T): Promise<void> {
    this.kafka.emit(topic, payload);
  }

  async onModuleDestroy() {
    await this.kafka.close();
  }
}