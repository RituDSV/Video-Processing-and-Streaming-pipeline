export interface VideoUploadedEvent {
  videoId: string;
  sourcePath: string;
  mimeType: string;

  retryCount?: number;   // defaults to 0
  errorMessage?: string;
}