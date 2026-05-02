import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { createKafkaOptions } from '@video-platform/config';
import { ClientKafka } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(
    WorkerModule,
    createKafkaOptions({
      clientId: 'video-worker',
      groupId: 'video-worker-transcode',
    }),
  );
  const kafkaClient = app.get<ClientKafka>('KAFKA_CLIENT');
  await kafkaClient.connect();
  await app.listen();
}

bootstrap();