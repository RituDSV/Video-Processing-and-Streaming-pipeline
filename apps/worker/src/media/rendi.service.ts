import { Injectable } from '@nestjs/common';

interface RendiResult {
  output_files: Record<string, string>;
  metadata?: {
    duration?: number;
    width?: number;
    height?: number;
  };
}

@Injectable()
export class RendiService {
  private readonly apiKey = process.env.RENDI_API_KEY!;
  private readonly apiUrl = 'https://api.rendi.dev/v1/run-ffmpeg-command';

  async processVideo(params: {
    inputUrl: string;
    videoId: string;
  }): Promise<{
    durationSeconds: number;
    width: number;
    height: number;
    hlsUrl: string;
    thumbnails: string[];
  }> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
      body: JSON.stringify({
        ffmpeg_command: this.buildFfmpegCommand(),
        input_files: {
          in_1: params.inputUrl,
        },
        output_files: {
          hls_manifest: 'index.m3u8',
          thumb_1: 'thumb_1.jpg',
          thumb_2: 'thumb_2.jpg',
        },
        max_command_run_seconds: 600,
        metadata: {
          videoId: params.videoId,
        },
        vcpu_count: 8,
      }),
    });

    if (!response.ok) {
      throw new Error(`Rendi processing failed: ${await response.text()}`);
    }

    const data = (await response.json()) as RendiResult;

    return {
      durationSeconds: data.metadata?.duration ?? 0,
      width: data.metadata?.width ?? 0,
      height: data.metadata?.height ?? 0,
      hlsUrl: data.output_files.hls_manifest,
      thumbnails: Object.values(data.output_files).filter((v) =>
        v.endsWith('.jpg'),
      ),
    };
  }

  private buildFfmpegCommand(): string {
    return `
      -i {{in_1}}
      -profile:v main
      -vf scale=-2:720
      -start_number 0
      -hls_time 6
      -hls_list_size 0
      -f hls {{hls_manifest}}
    `
      .replace(/\s+/g, ' ')
      .trim();
  }
}