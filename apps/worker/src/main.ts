import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { createKafkaOptions } from '@video-platform/config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(
    WorkerModule,
    createKafkaOptions({
      clientId: 'video-worker',
      groupId: 'video-worker-transcode',
    }),
  );

  await app.listen();
}

bootstrap();