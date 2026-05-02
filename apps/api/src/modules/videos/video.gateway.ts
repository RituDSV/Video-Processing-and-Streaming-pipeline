import {
    WebSocketGateway,
    WebSocketServer,
  } from '@nestjs/websockets';
  import { Server } from 'socket.io';
  
  @WebSocketGateway({
    cors: {
      origin: '*', // adjust to your frontend domain in production
    },
  })
  export class VideoGateway {
    @WebSocketServer()
    server!: Server;
  
    emitVideoReady(videoId: string) {
      this.server.emit('video.ready', { videoId });
    }
  
    emitVideoFailed(videoId: string, errorMessage: string) {
      this.server.emit('video.failed', { videoId, errorMessage });
    }
  }
  