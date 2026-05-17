import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { KafkaModule } from './infra/kafka/kafka.module';
import { VideosModule } from './modules/videos/videos.module';
import { PrismaModule } from './infra/db/prisma/prisma.module';
import { VideoGateway } from './modules/videos/video.gateway';
import { VideoProcessedConsumer } from './infra/kafka/video-processed.consumer';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Loads env vars (process.env)
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Infrastructure
    KafkaModule,   // ✅ producer only
    PrismaModule,
    // Domain modules
    VideosModule,
  ],
  controllers: [VideoProcessedConsumer, AppController],
  providers: [VideoGateway, AppService]
})
export class AppModule {}