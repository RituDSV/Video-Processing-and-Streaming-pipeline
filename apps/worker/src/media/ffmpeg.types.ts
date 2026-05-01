export interface VideoProcessingInput {
  videoId: string;
  sourcePath: string;
}

export interface VideoProcessingOutput {
  durationSeconds: number;
  width: number;
  height: number;

  outputs: {
    mp4?: string;
    hls?: string;
    thumbnails?: string[];
  };
}

export interface FfmpegOptions {
  generateHls: boolean;
  generateThumbnails: boolean;
}
