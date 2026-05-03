import { Controller, Inject, Logger } from "@nestjs/common";
import { PrismaService } from "../infra/db/prisma.service";
import { ClientKafka, EventPattern, Payload } from "@nestjs/microservices";
import { VideoUploadedEvent } from "@video-platform/shared";

@Controller()
export class VideoDLQConsumer {
  private readonly logger = new Logger(VideoDLQConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject("KAFKA_CLIENT") private readonly kafka: ClientKafka
  ) {}

  @EventPattern("video.uploaded.dlq")
  async handleDeadLetter(
    @Payload() payload: VideoUploadedEvent & { retryCount: number; errorMessage: string }
  ) {
    this.logger.error(`DLQ event for video ${payload.videoId}: ${payload.errorMessage}`);

    await this.prisma.videoDeadLetter.create({
      data: {
        videoId: payload.videoId,
        topic: "video.uploaded",
        errorMessage: payload.errorMessage ?? "Unknown error",
        retryCount: payload.retryCount ?? 0,
        payload: payload as any,
      },
    });
  }
}