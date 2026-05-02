import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createKafkaOptions } from '@video-platform/config'; // or inline the config
import { static as serveStatic } from 'express';
import { lookup } from 'mime-types';

async function bootstrap() {

  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use('/processed', (req: { path: any; }, res: { setHeader: (arg0: string, arg1: any) => void; }, next: () => void) => {
    const mimeType = lookup(req.path) || 'application/octet-stream';
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', mimeType);
    next();
  }, serveStatic(process.env.PROCESSED_DIR!));


  app.connectMicroservice(
    createKafkaOptions({
      clientId: 'video-api',
      groupId: 'video-api-consumer',
    })
  );

  await app.startAllMicroservices(); // 👈 starts Kafka consumer
  await app.listen(process.env.PORT ?? 3000);
} bootstrap();
