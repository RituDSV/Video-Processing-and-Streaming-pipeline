import { Module } from "@nestjs/common";
import { PrismaModule } from "./infra/db/prisma.module";
import { ConfigModule } from "@nestjs/config";
import { RedisModule } from "./infra/redis/redis.module";
import { VideoDLQConsumer } from "./consumers/video-dlq.consumer";
import { FfmpegService } from "./media/ffmpeg.service";
import { KafkaModule } from "./infra/kafka/kafka.module";
import { VideoUploadedConsumer } from "./consumers/video-uploaded.consumer";
// import { RendiService } from "./media/rendi.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    KafkaModule,
  ],

  providers: [
    // RendiService,
     FfmpegService,
    // {
    //   provide: "MEDIA_SERVICE",
    //   useClass: RendiService,
    // },
  ],

  controllers: [VideoUploadedConsumer, VideoDLQConsumer],
})
export class WorkerModule {}
