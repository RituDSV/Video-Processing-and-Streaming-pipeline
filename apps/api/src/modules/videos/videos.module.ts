import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { KafkaModule } from '../../infra/kafka/kafka.module';

@Module({
  imports:[
    KafkaModule
  ],
  controllers: [VideosController],
  providers: [VideosService],
})
export class VideosModule {}