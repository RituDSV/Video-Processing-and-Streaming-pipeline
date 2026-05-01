import { Injectable, BadRequestException } from '@nestjs/common';
import { KafkaProducerService } from '../../infra/kafka/kafka-producer.service';
import { VideoEvent } from '@video-platform/shared';
import { PrismaService } from '../../infra/db/prisma/prisma.service';

@Injectable()
export class VideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaProducerService,
  ) {}

  async registerUploadedVideo(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // 1️⃣ Create DB record
    const video = await this.prisma.video.create({
      data: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        sourcePath: file.path,           // ✅ already on disk
        status: 'UPLOADED',
      },
    });

    // 2️⃣ Emit Kafka event
    this.kafka.emit(VideoEvent.UPLOADED, {
      videoId: video.id,
      sourcePath: file.path,
      mimeType: file.mimetype,
    });

    return {
      videoId: video.id,
      status: 'UPLOADED',
    };
  }
}