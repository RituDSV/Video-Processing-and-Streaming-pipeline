import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import {
  VideoProcessingInput,
  VideoProcessingOutput,
  FfmpegOptions,
} from './ffmpeg.types';
import { spawn } from 'child_process';

@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);

  /* =============================
   * PUBLIC API
   * ============================= */

  async processVideo(
    input: VideoProcessingInput,
    options: FfmpegOptions,
  ): Promise<VideoProcessingOutput> {
    this.logger.log(`Starting ffmpeg processing for video ${input.videoId}`);

    const outputRoot = path.join(
      process.cwd(),
      'processed',
      input.videoId,
    );

    fs.mkdirSync(outputRoot, { recursive: true });

    /* 1️⃣ Extract metadata first */
    const metadata = await this.probeVideo(input.sourcePath);

    /* 2️⃣ Transcode to MP4 */
    const mp4Output = path.join(outputRoot, 'output.mp4');
    await this.transcodeMp4(input.sourcePath, mp4Output);

    /* 3️⃣ Optional HLS */
    let hlsManifest: string | undefined;
    if (options.generateHls) {
      const hlsDir = path.join(outputRoot, 'hls');
      fs.mkdirSync(hlsDir, { recursive: true });
      hlsManifest = await this.generateHls(mp4Output, hlsDir);
    }

    /* 4️⃣ Optional thumbnails */
    let thumbnails: string[] | undefined;
    if (options.generateThumbnails) {
      const thumbsDir = path.join(outputRoot, 'thumbnails');
      fs.mkdirSync(thumbsDir, { recursive: true });
      thumbnails = await this.generateThumbnails(mp4Output, thumbsDir);
    }

    this.logger.log(`ffmpeg processing completed for video ${input.videoId}`);

    return {
      durationSeconds: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      outputs: {
        mp4: mp4Output,
        hls: hlsManifest,
        thumbnails,
      },
    };
  }

  /* =============================
   * METADATA (ffprobe)
   * ============================= */

  private async probeVideo(inputPath: string): Promise<{
    duration: number;
    width: number;
    height: number;
  }> {
    this.logger.log(`Extracting metadata using ffprobe`);

    const args = [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height:format=duration',
      '-of',
      'json',
      inputPath,
    ];

    const output = await this.runCommandCapture('ffprobe', args);
    const parsed = JSON.parse(output);

    return {
      duration: Number(parsed.format.duration),
      width: Number(parsed.streams[0].width),
      height: Number(parsed.streams[0].height),
    };
  }

  /* =============================
   * MP4 TRANSCODE
   * ============================= */

  private async transcodeMp4(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    this.logger.log(`Transcoding MP4`);

    await this.runCommand('ffmpeg', [
      '-y',
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-movflags',
      '+faststart',
      outputPath,
    ]);
  }

  /* =============================
   * HLS GENERATION
   * ============================= */

  private async generateHls(
    mp4Path: string,
    hlsDir: string,
  ): Promise<string> {
    this.logger.log(`Generating HLS`);

    const manifestPath = path.join(hlsDir, 'index.m3u8');

    await this.runCommand('ffmpeg', [
      '-y',
      '-i',
      mp4Path,
      '-profile:v',
      'main',
      '-level',
      '3.1',
      '-start_number',
      '0',
      '-hls_time',
      '6',
      '-hls_list_size',
      '0',
      '-f',
      'hls',
      manifestPath,
    ]);

    return manifestPath;
  }

  /* =============================
   * THUMBNAILS
   * ============================= */

  private async generateThumbnails(
    mp4Path: string,
    thumbsDir: string,
  ): Promise<string[]> {
    this.logger.log(`Generating thumbnails`);

    const pattern = path.join(thumbsDir, 'thumb_%03d.jpg');

    await this.runCommand('ffmpeg', [
      '-y',
      '-i',
      mp4Path,
      '-vf',
      'fps=1',
      pattern,
    ]);

    return fs
      .readdirSync(thumbsDir)
      .filter((f) => f.endsWith('.jpg'))
      .map((f) => path.join(thumbsDir, f));
  }

  /* =============================
   * PROCESS HELPERS
   * ============================= */

  private async runCommand(
    command: string,
    args: string[],
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(command, args);

      proc.stderr.on('data', (data) => {
        this.logger.debug(data.toString());
      });

      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`${command} exited with code ${code}`));
      });
    });
  }

  private async runCommandCapture(
    command: string,
    args: string[],
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args);
      let output = '';

      proc.stdout.on('data', (d) => (output += d.toString()));
      proc.on('error', reject);
      proc.on('close', () => resolve(output));
    });
  }
}
