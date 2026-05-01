import { Controller, Inject } from "@nestjs/common";
import { PrismaService } from "../infra/db/prisma.service";
import { RedisService } from "../infra/redis/redis.service";
import { ClientKafka, EventPattern, Payload } from "@nestjs/microservices";
import { VideoUploadedEvent } from "@video-platform/shared";

@Controller()
export class VideoDLQConsumer {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject("KAFKA_CLIENT") private readonly kafka: ClientKafka
  ) {}

  @EventPattern("video.uploaded.dlq")
  handleDeadLetter(@Payload() message: { value: VideoUploadedEvent }) {
    console.error("DLQ event:", message.value);
    // send to Sentry, Slack, email, etc.
  }
}
