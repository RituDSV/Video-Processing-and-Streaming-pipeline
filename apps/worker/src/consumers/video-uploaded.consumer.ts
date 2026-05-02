import { Controller, Inject, Logger } from "@nestjs/common";
import { EventPattern, Payload, ClientKafka } from "@nestjs/microservices";
import { PrismaService } from "../infra/db/prisma.service";
import { RedisService } from "../infra/redis/redis.service";
import { FfmpegService } from "../media/ffmpeg.service";
import { VideoUploadedEvent } from "@video-platform/shared";
// import { RendiService } from "../media/rendi.service";

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [10_000, 60_000, 300_000]; // 10s, 1m, 5m

@Controller()
export class VideoUploadedConsumer {
  private readonly logger = new Logger(VideoUploadedConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly ffmpeg: FfmpegService,
    // private readonly rendi: RendiService,
    @Inject("KAFKA_CLIENT") private readonly kafka: ClientKafka
  ) {}

  /* =========================
   * PRIMARY ENTRY POINT
   * ========================= */
  @EventPattern("video.uploaded")
  async handleUploaded(@Payload() payload: any) {
    const event = this.parsePayload(payload);

    return this.handleProcessing(event);
  }

  /* =========================
   * RETRY ENTRY POINT
   * ========================= */
  @EventPattern("video.uploaded.retry")
  async handleRetry(@Payload() payload: any) {
    const event = this.parsePayload(payload);

    return this.handleProcessing(event);
  }

  /* =========================
   * SHARED PROCESSING LOGIC
   * ========================= */
  private async handleProcessing(event: VideoUploadedEvent) {
    const { videoId, sourcePath } = event;
    if (!videoId || !sourcePath) {
      this.logger.error("Invalid VideoUploadedEvent", event);
      return;
    }
    const retryCount = event.retryCount ?? 0;

    const lockKey = `video:process:${videoId}`;
    const lockTtlSeconds = 60 * 60; // 1 hour

    /* 1️⃣ Idempotency lock */
    const acquired = await this.redis.acquireLock(lockKey, lockTtlSeconds);

    if (!acquired) {
      this.logger.warn(
        `Duplicate processing attempt ignored for video ${videoId}`
      );
      return;
    }

    try {
      /* 2️⃣ DB → PROCESSING */
      await this.prisma.video.update({
        where: { id: videoId },
        data: { status: "PROCESSING" },
      });

      /* 3️⃣ Media processing (ffmpeg abstraction) */
      const result = await this.ffmpeg.processVideo(
        { videoId, sourcePath },
        { generateHls: true, generateThumbnails: true }
      );

      // const result = await this.rendi.processVideo({
      //   videoId,
      //   inputUrl: sourcePath, // ideally a signed S3 or upload URL
      // });

      /* ✅ Persist metadata */
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          status: "READY",
          durationSec: result.durationSeconds,
          width: result.width,
          height: result.height,
          renditions: {
            create: [
              ...(result.outputs.mp4
                ? [
                    {
                      type: "MP4" as any,
                      path: result.outputs.mp4,
                    },
                  ]
                : []),
              ...(result.outputs.hls
                ? [
                    {
                      type: "HLS" as any,
                      path: result.outputs.hls,
                    },
                  ]
                : []),
            ],
          },
        },
      });

      // await this.prisma.video.update({
      //   where: { id: videoId },
      //   data: {
      //     status: 'READY',
      //     durationSec: result.durationSeconds,
      //     width: result.width,
      //     height: result.height,
      //     renditions: {
      //       create: [
      //         {
      //           type: 'HLS',
      //           path: result.hlsUrl,
      //         },
      //       ],
      //     },
      //   },
      // });

      this.logger.log(`Video ${videoId} processed successfully`);
    } catch (error: any) {
      this.logger.error(`Processing failed for video ${videoId}`, error?.stack);

      /* 5️⃣ DB → FAILED */
      await this.prisma.video.update({
        where: { id: videoId },
        data: { status: "FAILED" },
      });

      /* 6️⃣ Release idempotency lock so retries are possible */
      await this.redis.releaseLock(lockKey);

      /* 7️⃣ Retry or send to DLQ */
      await this.handleFailure(event, retryCount, error);
    }
  }

  /* =========================
   * FAILURE HANDLING
   * ========================= */
  private async handleFailure(
    event: VideoUploadedEvent,
    retryCount: number,
    error: Error
  ) {
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS_MS[retryCount];

      this.logger.warn(
        `Retrying video ${event.videoId} (attempt ${
          retryCount + 1
        }/${MAX_RETRIES}) in ${delay}ms`
      );

      setTimeout(() => {
        this.kafka.emit("video.uploaded.retry", {
          ...event,
          retryCount: retryCount + 1,
          errorMessage: error.message,
        });
      }, delay);

      return;
    }

    /* 🔥 Dead‑letter queue */
    this.logger.error(
      `Video ${event.videoId} sent to DLQ after ${MAX_RETRIES} retries`
    );

    this.kafka.emit("video.uploaded.dlq", {
      ...event,
      retryCount,
      errorMessage: error.message,
    });
  }

  private parsePayload(payload: any): VideoUploadedEvent {
    if (!payload) {
      throw new Error("Kafka payload is empty");
    }

    // KafkaJS delivers value as Buffer by default
    if (Buffer.isBuffer(payload)) {
      return JSON.parse(payload.toString());
    }

    // In case it's already deserialized
    return payload as VideoUploadedEvent;
  }
}
