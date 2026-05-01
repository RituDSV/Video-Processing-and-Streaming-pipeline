import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideosService } from './videos.service';
import { videoStorage } from './storage/multer.config';

@Controller('videos')
export class VideosController {
  constructor(private readonly videos: VideosService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: videoStorage,
      limits: {
        fileSize: 5 * 1024 * 1024 * 1024, // 5 GB
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    return this.videos.registerUploadedVideo(file);
  }
}