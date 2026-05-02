import { Controller } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { VideoGateway } from "../../modules/videos/video.gateway";

@Controller()
export class VideoProcessedConsumer {
  constructor(private readonly gateway: VideoGateway) {}

  @EventPattern("video.processed")
  async handleProcessed(@Payload() event: any) {
    if (event.status === "READY") {
      console.log("emit video ready");
      this.gateway.emitVideoReady(event.videoId);
    } else {
      console.log("emit video failed");
      this.gateway.emitVideoFailed(event.videoId, event.errorMessage);
    }
  }
}
