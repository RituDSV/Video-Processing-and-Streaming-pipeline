import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { KafkaProducerService } from '../../infra/kafka/kafka-producer.service';
import { VideoEvent } from '@video-platform/shared';
import { PrismaService } from '../../infra/db/prisma/prisma.service';

@Injectable()
export class VideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaProducerService,
  ) { }

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

  async getVideoById(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: { renditions: true },
    });

    if (!video) throw new NotFoundException(`Video ${id} not found`);

    const mp4 = video.renditions.find((r) => r.type === 'MP4');
    const hls = video.renditions.find((r) => r.type === 'HLS');
    console.log('raw rendition path:', mp4?.path);

    return {
      videoId: video.id,
      status: video.status,
      originalName: video.originalName,
      durationSec: video.durationSec,
      width: video.width,
      height: video.height,
      url: this.toUrl(mp4?.path ?? hls?.path ?? null),
      renditions: {
        mp4: this.toUrl(mp4?.path),
        hls: this.toUrl(hls?.path),
      },
    };
  }

  async getVideos(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [videos, total] = await this.prisma.$transaction([
      this.prisma.video.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { renditions: true },
      }),
      this.prisma.video.count(),
    ]);

    return {
      data: videos.map((v) => ({
        videoId: v.id,
        originalName: v.originalName,
        status: v.status,
        durationSec: v.durationSec,
        width: v.width,
        height: v.height,
        sizeBytes: Number(v.sizeBytes),
        createdAt: v.createdAt,
        url: this.toUrl(v.renditions.find(r => r.type === 'MP4')?.path
          ?? v.renditions.find(r => r.type === 'HLS')?.path),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDlqEntries(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.videoDeadLetter.findMany({
        skip,
        take: limit,
        where: { resolvedAt: null }, // only unresolved
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.videoDeadLetter.count({ where: { resolvedAt: null } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDlqCount() {
    const count = await this.prisma.videoDeadLetter.count({
      where: { resolvedAt: null },
    });
    return { count };
  }

  async retryDlqEntry(id: string) {
    const entry = await this.prisma.videoDeadLetter.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`DLQ entry ${id} not found`);
  
    // Re-emit the original event to Kafka
    this.kafka.emit(VideoEvent.UPLOADED, entry.payload);
  
    // Mark as resolved
    await this.prisma.videoDeadLetter.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });
  
    return { success: true };
  }
  
  async deleteDlqEntry(id: string) {
    await this.prisma.videoDeadLetter.delete({ where: { id } });
    return { success: true };
  }

  private toUrl(path: string | undefined | null): string | null {
    if (!path) return null;
    const segment = path.split('/processed/')[1];
    if (!segment) return null;
    return `${process.env.API_URL ?? 'http://localhost:3000'}/processed/${segment}`;
  }
}